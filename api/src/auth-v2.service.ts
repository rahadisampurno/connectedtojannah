import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from './database.service';
import { EmailService } from './email.service';

export interface PublicUser { id:string; email:string; displayName:string; avatar:string; joinedAt:string; emailVerified:boolean; onboardingCompleted:boolean; timezone:string; language:string }
interface StoredUser { id:string;email:string;display_name:string;avatar:string;joined_at:Date;password_hash:string;email_verified_at:Date|null;onboarding_completed:boolean;timezone:string;language:string }
interface AccessPayload { sub:string;email:string;exp:number;iat:number;iss?:string;aud?:string }
type Device={name?:string};
const JWT_ISSUER = 'connected-to-jannah';
const JWT_AUDIENCE = 'connected-to-jannah-client';
const b64=(value:string|Buffer)=>Buffer.from(value).toString('base64url');
const hashOpaque=(value:string)=>createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthV2Service {
 private readonly secret=process.env.ACCESS_TOKEN_SECRET??'ctj-local-development-secret-change-in-production';
 constructor(private readonly db:DatabaseService,private readonly email:EmailService){}

 async register(email:string,password:string,displayName:string,termsAccepted:boolean,timezone:string,device:Device={}){
  if(!termsAccepted)throw new BadRequestException({code:'TERMS_REQUIRED',message:'Kamu perlu menyetujui Ketentuan dan Kebijakan Privasi.'});
  const normalized=email.trim().toLowerCase(),id=randomBytes(12).toString('hex'),avatar=displayName.trim().slice(0,1).toUpperCase();
  try{
    const result=await this.db.query<StoredUser>('INSERT INTO users(id,email,display_name,avatar,password_hash,terms_accepted_at,timezone,email_verified_at) VALUES($1,$2,$3,$4,$5,now(),$6,now()) RETURNING *',[id,normalized,displayName.trim(),avatar,this.hashPassword(password),timezone]);
    await this.db.query('INSERT INTO notifications(id,user_id,title,message) VALUES($1,$2,$3,$4)',[randomBytes(12).toString('hex'),id,'Selamat datang','Pilih amalan yang ingin kamu jaga. Mulailah dari yang ringan dan mampu dilakukan.']);
    return {
      ...(await this.issueSession(result.rows[0],device)),
      verificationRequired: false
    };
  }catch(error:any){if(error?.code==='23505')throw new ConflictException({code:'EMAIL_ALREADY_USED',message:'Email sudah terdaftar.'});throw error}
 }
 async login(email:string,password:string,device:Device={}){const result=await this.db.query<StoredUser>('SELECT * FROM users WHERE email=$1',[email.trim().toLowerCase()]);const user=result.rows[0];if(!user||!this.verifyPassword(password,user.password_hash))throw new UnauthorizedException({code:'INVALID_CREDENTIALS',message:'Email atau kata sandi belum tepat.'});return this.issueSession(user,device)}
 async refresh(refreshToken:string|undefined,device:Device={}){if(!refreshToken)throw this.sessionExpired();const key=hashOpaque(refreshToken);return this.db.transaction(async client=>{const result=await client.query<StoredUser>('DELETE FROM refresh_sessions s USING users u WHERE s.token_hash=$1 AND s.user_id=u.id AND s.expires_at>now() RETURNING u.*',[key]);const user=result.rows[0];if(!user)throw this.sessionExpired();return this.issueSession(user,device,client)})}
 async logout(refreshToken:string|undefined){if(refreshToken)await this.db.query('DELETE FROM refresh_sessions WHERE token_hash=$1',[hashOpaque(refreshToken)]);return{success:true}}
 async verifyAccess(token:string):Promise<PublicUser>{
  const[header,body,signature]=token.split('.');
  if(!header||!body||!signature)throw this.unauthorized();
  let parsedHeader:{alg?:string;typ?:string};
  try{parsedHeader=JSON.parse(Buffer.from(header,'base64url').toString())}catch{throw this.unauthorized()}
  if(parsedHeader.alg!=='HS256'||parsedHeader.typ!=='JWT')throw this.unauthorized();
  const expected=b64(createHmac('sha256',this.secret).update(`${header}.${body}`).digest());
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))throw this.unauthorized();
  let payload:AccessPayload;
  try{payload=JSON.parse(Buffer.from(body,'base64url').toString())}catch{throw this.unauthorized()}
  const now=Math.floor(Date.now()/1000);
  if(!payload.exp||payload.exp<now-5)throw this.unauthorized();
  if(!payload.iat||payload.iat>now+60)throw this.unauthorized();
  if(payload.iss&&payload.iss!==JWT_ISSUER)throw this.unauthorized();
  if(payload.aud&&payload.aud!==JWT_AUDIENCE)throw this.unauthorized();
  if(!payload.sub)throw this.unauthorized();
  const result=await this.db.query<StoredUser>('SELECT * FROM users WHERE id=$1',[payload.sub]);
  return this.publicUser(result.rows[0])
 }
 async updateProfile(id:string,displayName:string){const current=await this.db.query<StoredUser>('SELECT * FROM users WHERE id=$1',[id]);if(!current.rows[0])throw this.unauthorized();return this.updateAccount(id,{displayName,timezone:current.rows[0].timezone,language:current.rows[0].language})}
 async updateAccount(id:string,input:{displayName:string;timezone:string;language:string;avatar?:string;locationName?:string;latitude?:number;longitude?:number}){const result=await this.db.query<StoredUser>('UPDATE users SET display_name=$2,avatar=coalesce($3,avatar),timezone=$4,language=$5,location_name=coalesce($6,location_name),latitude=coalesce($7,latitude),longitude=coalesce($8,longitude) WHERE id=$1 RETURNING *',[id,input.displayName.trim(),input.avatar??null,input.timezone,input.language,input.locationName??null,input.latitude??null,input.longitude??null]);return this.publicUser(result.rows[0])}
 async changePassword(id:string,currentPassword:string,newPassword:string){const result=await this.db.query<StoredUser>('SELECT * FROM users WHERE id=$1',[id]);if(!result.rows[0]||!this.verifyPassword(currentPassword,result.rows[0].password_hash))throw new BadRequestException({code:'CURRENT_PASSWORD_INVALID',message:'Kata sandi saat ini belum tepat.'});await this.db.transaction(async client=>{await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[id,this.hashPassword(newPassword)]);await client.query('DELETE FROM refresh_sessions WHERE user_id=$1',[id])});return{success:true}}
 async requestVerification(id:string){const user=await this.db.query<StoredUser>('SELECT * FROM users WHERE id=$1',[id]);if(!user.rows[0])throw this.unauthorized();if(user.rows[0].email_verified_at)return{success:true,alreadyVerified:true};const token=await this.createAccountToken(id,'VERIFY_EMAIL',24);await this.deliverToken(user.rows[0].email,'Verifikasi email Connected to Jannah','verify-email',token.token);return{success:true,...this.devToken('devVerificationToken',token.token)}}
 async verifyEmail(token:string){const userId=await this.consumeToken(token,'VERIFY_EMAIL');await this.db.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[userId]);return{success:true}}
 async requestPasswordReset(email:string){const user=await this.db.query<StoredUser>('SELECT * FROM users WHERE email=$1',[email.trim().toLowerCase()]);if(user.rows[0]){const token=await this.createAccountToken(user.rows[0].id,'RESET_PASSWORD',1);await this.deliverToken(user.rows[0].email,'Atur ulang kata sandi Connected to Jannah','reset-password',token.token);return{success:true,...this.devToken('devResetToken',token.token)}}return{success:true}}
 async resetPassword(token:string,password:string){const userId=await this.consumeToken(token,'RESET_PASSWORD');await this.db.transaction(async client=>{await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[userId,this.hashPassword(password)]);await client.query('DELETE FROM refresh_sessions WHERE user_id=$1',[userId])});return{success:true}}
 async sessions(userId:string){const result=await this.db.query<any>('SELECT session_id,token_hash,device_name,created_at,last_used_at,expires_at FROM refresh_sessions WHERE user_id=$1 AND expires_at>now() ORDER BY last_used_at DESC',[userId]);return result.rows.map((row,idx)=>({id:row.session_id||row.token_hash||`session-${idx}-${Date.now()}`,deviceName:row.device_name??'Perangkat tidak dikenal',createdAt:row.created_at?.toISOString?.()??new Date().toISOString(),lastUsedAt:row.last_used_at?.toISOString?.()??new Date().toISOString(),expiresAt:row.expires_at?.toISOString?.()??new Date().toISOString()}))}
 async revokeSession(userId:string,sessionId:string){await this.db.query('DELETE FROM refresh_sessions WHERE user_id=$1 AND (session_id=$2 OR token_hash=$2)',[userId,sessionId]);return{success:true}}
 async exportData(userId:string){const [user,amalan,daily,circles,challenges]=await Promise.all([this.db.query<any>('SELECT id,email,display_name,avatar,joined_at,timezone,language,privacy_visibility FROM users WHERE id=$1',[userId]),this.db.query<any>('SELECT title,note,period,kind,target_value,unit,active FROM user_amalan WHERE user_id=$1',[userId]),this.db.query<any>('SELECT local_date,title,status,current_value,target_value FROM daily_entries WHERE user_id=$1 ORDER BY local_date DESC',[userId]),this.db.query<any>('SELECT c.id,c.name,c.type,m.role,m.joined_at FROM circles c JOIN circle_members m ON m.circle_id=c.id WHERE m.user_id=$1',[userId]),this.db.query<any>('SELECT challenge_id,current_value,status,joined_at FROM challenge_memberships WHERE user_id=$1',[userId])]);return{exportedAt:new Date().toISOString(),profile:user.rows[0],amalan:amalan.rows,dailyHistory:daily.rows,circles:circles.rows,challenges:challenges.rows}}
 async deleteAccount(userId:string,password:string){const user=await this.db.query<StoredUser>('SELECT * FROM users WHERE id=$1',[userId]);if(!user.rows[0]||!this.verifyPassword(password,user.rows[0].password_hash))throw new BadRequestException({code:'PASSWORD_INVALID',message:'Kata sandi belum tepat.'});await this.db.query('DELETE FROM users WHERE id=$1',[userId]);return{success:true}}

 private async createAccountToken(userId:string,purpose:string,hours:number){await this.db.query('DELETE FROM account_tokens WHERE user_id=$1 AND purpose=$2',[userId,purpose]);const token=randomBytes(32).toString('base64url');await this.db.query(`INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,now()+($4||' hours')::interval)`,[hashOpaque(token),userId,purpose,hours]);return{token}}
 private async consumeToken(token:string,purpose:string){return this.db.transaction(async client=>{const result=await client.query<any>('UPDATE account_tokens SET used_at=now() WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>now() RETURNING user_id',[hashOpaque(token),purpose]);if(!result.rowCount)throw new BadRequestException({code:'TOKEN_INVALID',message:'Tautan tidak valid atau sudah kedaluwarsa.'});return result.rows[0].user_id as string})}
 private async deliverToken(to:string,subject:string,path:string,token:string){const base=process.env.WEB_ORIGIN??'http://localhost:3001',url=`${base}/${path}?token=${encodeURIComponent(token)}`;await this.email.send(to,subject,`<p>Gunakan tautan berikut untuk melanjutkan:</p><p><a href="${url}">${url}</a></p><p>Tautan ini bersifat pribadi dan akan kedaluwarsa.</p>`)}
 private devToken<T extends string>(key:T,token:string):Record<T,string>|Record<string,never>{return process.env.NODE_ENV==='production'?{}:{[key]:token} as Record<T,string>}
 private async issueSession(user:StoredUser,device:Device={},client?:{query:(text:string,values?:unknown[])=>Promise<unknown>}){
  const now=Math.floor(Date.now()/1000),payload:AccessPayload={sub:user.id,email:user.email,iat:now,exp:now+15*60,iss:JWT_ISSUER,aud:JWT_AUDIENCE},header=b64(JSON.stringify({alg:'HS256',typ:'JWT'})),body=b64(JSON.stringify(payload)),signature=b64(createHmac('sha256',this.secret).update(`${header}.${body}`).digest()),refreshToken=randomBytes(48).toString('base64url'),sessionId=randomBytes(12).toString('hex');
  await(client??this.db).query('INSERT INTO refresh_sessions(token_hash,user_id,expires_at,session_id,device_name) VALUES($1,$2,now()+interval \'7 days\',$3,$4)',[hashOpaque(refreshToken),user.id,sessionId,device.name??'Browser']);
  return{accessToken:`${header}.${body}.${signature}`,expiresIn:900,refreshToken,user:this.publicUser(user)}
 }
 private hashPassword(password:string){const salt=randomBytes(16);return`${salt.toString('hex')}:${scryptSync(password,salt,64).toString('hex')}`}
 private verifyPassword(password:string,stored:string){const[salt,hash]=stored.split(':');const a=scryptSync(password,Buffer.from(salt,'hex'),64),b=Buffer.from(hash,'hex');return a.length===b.length&&timingSafeEqual(a,b)}
 private publicUser(user:StoredUser|undefined):PublicUser{if(!user)throw this.unauthorized();return{id:user.id,email:user.email,displayName:user.display_name,avatar:user.avatar,joinedAt:user.joined_at.toISOString(),emailVerified:Boolean(user.email_verified_at),onboardingCompleted:user.onboarding_completed,timezone:user.timezone,language:user.language}}
 private unauthorized(){return new UnauthorizedException({code:'UNAUTHORIZED',message:'Silakan masuk untuk melanjutkan.'})}
 private sessionExpired(){return new UnauthorizedException({code:'SESSION_EXPIRED',message:'Sesi telah berakhir. Silakan masuk kembali.'})}
}
