import { Body, CanActivate, Controller, Delete, ExecutionContext, Get, Headers, Injectable, Module, Param, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { AppDataV2Service } from './app-data-v2.service';
import { AuthV2Service, PublicUser } from './auth-v2.service';
import { DailyV2Service } from './daily-v2.service';
import { DatabaseService } from './database.service';
import { EmailService } from './email.service';

const avatarKeys = ['najm','nura','raihan','salma','fawwaz','aaliyah','zayd','ihsan','hana','maira'] as const;

class CompleteDto { @IsUUID('4', { message: 'ID mutasi tidak valid.' }) clientMutationId!: string; }
class RegisterDto {
  @IsEmail({}, { message: 'Format alamat email belum valid (contoh: nama@email.com).' })
  email!: string;

  @IsString({ message: 'Nama panggilan harus berupa teks.' })
  @MinLength(2, { message: 'Nama panggilan minimal 2 karakter.' })
  @MaxLength(40, { message: 'Nama panggilan maksimal 40 karakter.' })
  displayName!: string;

  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/, {
    message: 'Kata sandi minimal 8 karakter dan wajib memuat kombinasi huruf, angka, serta simbol.'
  })
  password!: string;

  @IsBoolean({ message: 'Kamu perlu mencentang persetujuan Ketentuan dan Kebijakan Privasi.' })
  termsAccepted!: boolean;

  @IsString({ message: 'Zona waktu tidak valid.' })
  @MaxLength(64)
  timezone!: string;
}
class LoginDto {
  @IsEmail({}, { message: 'Format alamat email belum valid.' })
  email!: string;

  @IsString({ message: 'Kata sandi tidak boleh kosong.' })
  @MinLength(1, { message: 'Kata sandi tidak boleh kosong.' })
  password!: string;
}
class ProfileDto {
  @IsString({ message: 'Nama panggilan harus berupa teks.' })
  @MinLength(2, { message: 'Nama panggilan minimal 2 karakter.' })
  @MaxLength(40, { message: 'Nama panggilan maksimal 40 karakter.' })
  displayName!: string;
}
class AccountDto extends ProfileDto { @IsString() @MaxLength(64) timezone!:string; @IsIn(['id','en']) language!:string; @IsOptional() @IsIn(avatarKeys) avatar?:string; @IsOptional() @IsString() @MaxLength(80) locationName?:string; @IsOptional() @IsNumber() latitude?:number; @IsOptional() @IsNumber() longitude?:number; }
class PasswordDto {
  @IsString({ message: 'Kata sandi saat ini harus diisi.' })
  currentPassword!: string;

  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/, {
    message: 'Kata sandi baru minimal 8 karakter dan wajib memuat kombinasi huruf, angka, serta simbol.'
  })
  newPassword!: string;
}
class DeleteAccountDto { @IsString({ message: 'Kata sandi harus diisi untuk konfirmasi.' }) password!:string; }
class EmailDto { @IsEmail({}, { message: 'Format alamat email belum valid.' }) email!:string; }
class TokenDto { @IsString() @MinLength(20, { message: 'Token tidak valid.' }) token!:string; }
class ResetPasswordDto extends TokenDto {
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/, {
    message: 'Kata sandi baru minimal 8 karakter dan wajib memuat kombinasi huruf, angka, serta simbol.'
  })
  password!: string;
}
class OnboardingDto { @IsIn(avatarKeys) avatar!:string; @IsArray() @ArrayMinSize(1) @IsString({each:true}) amalanKeys!:string[]; @IsString() @MaxLength(64) timezone!:string; @IsBoolean() remindersEnabled!:boolean; }
class PrivacyDto { @IsIn(['PRIVATE', 'COMPLETION_ONLY', 'PERCENTAGE', 'DETAIL']) visibility!: string; }
class PreferencesDto { @IsBoolean() remindersEnabled!: boolean; @IsBoolean() reducedMotion!: boolean; @IsOptional() @IsString() quietStart?:string; @IsOptional() @IsString() quietEnd?:string; @IsOptional() @IsBoolean() reminderNotifications?:boolean; @IsOptional() @IsBoolean() circleNotifications?:boolean; @IsOptional() @IsBoolean() milestoneNotifications?:boolean; }
class CircleCustomAmalanDto { @IsString() @MinLength(2) @MaxLength(100) title!:string; @IsString() @MaxLength(240) note!:string; @IsIn(['PAGI','SIANG','SORE','MALAM']) period!:string; @IsIn(['CHECKLIST','COUNTER','DURATION']) kind!:string; @IsInt() @Min(1) @Max(10000) target!:number; @IsOptional() @IsString() @MaxLength(24) unit?:string; }
class CircleDto { @IsString() @MinLength(2) @MaxLength(60) name!: string; @IsIn(['Pribadi','Pasangan','Keluarga','Sahabat','Kajian','Komunitas']) type!: string; @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({each:true}) amalanKeys?:string[]; @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({each:true}) @Type(()=>CircleCustomAmalanDto) customAmalan?:CircleCustomAmalanDto[]; }
class CircleAmalanDto { @IsArray() @ArrayMaxSize(12) @IsString({each:true}) amalanKeys!:string[]; }
class CustomAmalanDto { @IsString() @MinLength(2) @MaxLength(100) title!:string; @IsString() @MaxLength(240) note!:string; @IsIn(['PAGI','SIANG','SORE','MALAM']) period!:any; @IsIn(['CHECKLIST','COUNTER','QUANTITY','DURATION','CUSTOM']) kind!:any; @IsInt() @Min(1) @Max(10000) target!:number; @IsOptional() @IsString() @MaxLength(24) unit?:string; }
class ActiveDto { @IsBoolean() active!:boolean; }
class TargetDto { @IsInt() @Min(1) @Max(10000) target!:number; }
class TemplateDto { @IsString() @MinLength(2) @MaxLength(80) key!:string; }
class BookmarkDto { @IsBoolean() bookmarked!:boolean; }
class InviteDto { @IsIn(['PRIVATE','COMMUNITY']) mode!:string; @IsInt() @Min(1) @Max(500) maxUses!:number; @IsInt() @Min(1) @Max(30) expiresInDays!:number; @IsBoolean() approvalRequired!:boolean; }
class ChallengeActionDto { @IsIn(['ACTIVE','PAUSED','LEFT']) status!:string; }
class CircleChallengeDto { @IsString() @MinLength(3) @MaxLength(40) challengeId!:string; }
class EncouragementDto { @IsIn(['ease','continue','little','steadfast','goodness']) key!:string; }
class MemberActionDto { @IsIn(['APPROVE','REMOVE','ADMIN','MEMBER']) action!:'APPROVE'|'REMOVE'|'ADMIN'|'MEMBER'; }
class TransferDto { @IsString() memberId!:string; }
class CircleTestLevelDto { @IsInt() @Min(1) @Max(30) level!:number; }

const refreshCookie = (token: string) => `ctj_refresh=${token}; HttpOnly; Path=/v1/auth; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const clearCookie = () => `ctj_refresh=; HttpOnly; Path=/v1/auth; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const cookieValue = (header: string | undefined, key: string) => header?.split(';').map((part) => part.trim().split('=')).find(([name]) => name === key)?.slice(1).join('=');

@Injectable()
class AccessGuard implements CanActivate {
  constructor(private readonly auth: AuthV2Service) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: PublicUser }>();
    const bearer = request.headers.authorization;
    if (!bearer?.startsWith('Bearer ')) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Silakan masuk untuk melanjutkan.' });
    request.user = await this.auth.verifyAccess(bearer.slice(7)); return true;
  }
}

@Controller('v1/auth')
class AuthController {
  constructor(private readonly auth: AuthV2Service) {}
  @Post('register') async register(@Body() body: RegisterDto,@Headers('user-agent') agent:string|undefined,@Res({ passthrough: true }) res: any) { const session = await this.auth.register(body.email,body.password,body.displayName,body.termsAccepted,body.timezone,{name:agent}); res.setHeader('Set-Cookie', refreshCookie(session.refreshToken)); const { refreshToken: _, ...safe } = session; return safe; }
  @Post('login') async login(@Body() body: LoginDto,@Headers('user-agent') agent:string|undefined,@Res({ passthrough: true }) res: any) { const session = await this.auth.login(body.email,body.password,{name:agent}); res.setHeader('Set-Cookie', refreshCookie(session.refreshToken)); const { refreshToken: _, ...safe } = session; return safe; }
  @Post('refresh') async refresh(@Headers('cookie') cookie: string | undefined,@Headers('user-agent') agent:string|undefined,@Res({ passthrough: true }) res: any) { const session = await this.auth.refresh(cookieValue(cookie, 'ctj_refresh'),{name:agent}); res.setHeader('Set-Cookie', refreshCookie(session.refreshToken)); const { refreshToken: _, ...safe } = session; return safe; }
  @Post('logout') logout(@Headers('cookie') cookie: string | undefined, @Res({ passthrough: true }) res: any) { res.setHeader('Set-Cookie', clearCookie()); return this.auth.logout(cookieValue(cookie, 'ctj_refresh')); }
  @Post('forgot-password') forgot(@Body() body:EmailDto){return this.auth.requestPasswordReset(body.email)}
  @Post('reset-password') reset(@Body() body:ResetPasswordDto){return this.auth.resetPassword(body.token,body.password)}
  @Post('verify-email') verify(@Body() body:TokenDto){return this.auth.verifyEmail(body.token)}
}

@Controller()
class AppController {
  constructor(private readonly daily: DailyV2Service, private readonly data: AppDataV2Service, private readonly auth: AuthV2Service) {}
  @Get('health') health() { return { status: 'ok', service: 'connected-to-jannah-api', timestamp: new Date().toISOString() }; }
  @UseGuards(AccessGuard) @Get('v1/me') me(@Req() req: any) { return req.user; }
  @UseGuards(AccessGuard) @Patch('v1/me') updateMe(@Req() req: any, @Body() body: ProfileDto) { return this.auth.updateProfile(req.user.id, body.displayName); }
  @UseGuards(AccessGuard) @Patch('v1/account') updateAccount(@Req() req:any,@Body() body:AccountDto){return this.auth.updateAccount(req.user.id,body)}
  @UseGuards(AccessGuard) @Patch('v1/account/password') password(@Req() req:any,@Body() body:PasswordDto){return this.auth.changePassword(req.user.id,body.currentPassword,body.newPassword)}
  @UseGuards(AccessGuard) @Get('v1/account/export') exportData(@Req() req:any){return this.auth.exportData(req.user.id)}
  @UseGuards(AccessGuard) @Post('v1/account/delete') deleteAccount(@Req() req:any,@Body() body:DeleteAccountDto,@Res({passthrough:true}) res:any){res.setHeader('Set-Cookie',clearCookie());return this.auth.deleteAccount(req.user.id,body.password)}
  @UseGuards(AccessGuard) @Get('v1/account/sessions') sessions(@Req() req:any){return this.auth.sessions(req.user.id)}
  @UseGuards(AccessGuard) @Post('v1/account/sessions/:id/revoke') revoke(@Req() req:any,@Param('id') id:string){return this.auth.revokeSession(req.user.id,id)}
  @UseGuards(AccessGuard) @Post('v1/auth/resend-verification') resend(@Req() req:any){return this.auth.requestVerification(req.user.id)}
  @UseGuards(AccessGuard) @Post('v1/onboarding') onboarding(@Req() req:any,@Body() body:OnboardingDto){return this.daily.configure(req.user.id,body.amalanKeys,body.timezone,body.remindersEnabled,body.avatar)}
  @UseGuards(AccessGuard) @Get('v1/overview') overview(@Req() req: any) { return this.data.getOverview(req.user.id); }
  @UseGuards(AccessGuard) @Post('v1/circles') createCircle(@Req() req:any,@Body() body:CircleDto){return this.data.createCircle(req.user.id,body.name,body.type,body.amalanKeys??['subuh'],body.customAmalan??[])}
  @UseGuards(AccessGuard) @Get('v1/daily') getDaily(@Req() req: any) { return this.daily.get(req.user.id); }
  @UseGuards(AccessGuard) @Post('v1/daily/:entryId/complete') complete(@Req() req: any, @Param('entryId') entryId: string, @Body() body: CompleteDto) { return this.daily.complete(req.user.id, entryId, body.clientMutationId); }
  @UseGuards(AccessGuard) @Post('v1/daily/:entryId/skip') skip(@Req() req:any,@Param('entryId') id:string){return this.daily.skip(req.user.id,id)}
  @UseGuards(AccessGuard) @Get('v1/daily/history') history(@Req() req:any){return this.daily.history(req.user.id)}
  @UseGuards(AccessGuard) @Get('v1/amalan/catalog') catalog(@Req() req:any){return this.daily.catalog(req.user.id)}
  @UseGuards(AccessGuard) @Post('v1/amalan/custom') custom(@Req() req:any,@Body() body:CustomAmalanDto){return this.daily.addCustom(req.user.id,body)}
  @UseGuards(AccessGuard) @Post('v1/amalan/templates') addTemplate(@Req() req:any,@Body() body:TemplateDto){return this.daily.addTemplate(req.user.id,body.key)}
  @UseGuards(AccessGuard) @Post('v1/amalan/activate-all') activateAll(@Req() req:any){return this.daily.activateAllTemplates(req.user.id)}
  @UseGuards(AccessGuard) @Patch('v1/amalan/:id/active') active(@Req() req:any,@Param('id') id:string,@Body() body:ActiveDto){return this.daily.setActive(req.user.id,id,body.active)}
  @UseGuards(AccessGuard) @Patch('v1/amalan/:id/target') target(@Req() req:any,@Param('id') id:string,@Body() body:TargetDto){return this.daily.setTarget(req.user.id,id,body.target)}
  @UseGuards(AccessGuard) @Patch('v1/amalan/:id/bookmark') bookmark(@Req() req:any,@Param('id') id:string,@Body() body:BookmarkDto){return this.daily.bookmark(req.user.id,id,body.bookmarked)}
  @UseGuards(AccessGuard) @Delete('v1/amalan/:id') deleteAmalan(@Req() req:any,@Param('id') id:string){return this.daily.deleteAmalan(req.user.id,id)}
  @UseGuards(AccessGuard) @Post('v1/amalan/:id/delete') deleteAmalanPost(@Req() req:any,@Param('id') id:string){return this.daily.deleteAmalan(req.user.id,id)}
  @UseGuards(AccessGuard) @Post('v1/challenges/:id/join') join(@Req() req: any, @Param('id') id: string) { return this.data.joinChallenge(req.user.id, id); }
  @UseGuards(AccessGuard) @Patch('v1/challenges/:id/status') challengeStatus(@Req() req:any,@Param('id') id:string,@Body() body:ChallengeActionDto){return this.data.updateChallenge(req.user.id,id,body.status)}
  @UseGuards(AccessGuard) @Get('v1/challenges/:id/calendar') challengeCalendar(@Req() req:any,@Param('id') id:string){return this.data.challengeCalendar(req.user.id,id)}
  @Get('v1/circles/milestones') circleMilestones(){return this.data.getCollectiveMilestones()}
  @UseGuards(AccessGuard) @Get('v1/circles/:id') circleDetail(@Req() req:any,@Param('id') id:string){return this.data.circleDetail(req.user.id,id)}
  @UseGuards(AccessGuard) @Patch('v1/circles/:id/testing/level') testCircleLevel(@Req() req:any,@Param('id') id:string,@Body() body:CircleTestLevelDto){return this.data.setTestCircleLevel(req.user.id,id,body.level)}
  @UseGuards(AccessGuard) @Delete('v1/circles/:id/testing/level') resetTestCircleLevel(@Req() req:any,@Param('id') id:string){return this.data.resetTestCircleLevel(req.user.id,id)}
  @UseGuards(AccessGuard) @Patch('v1/circles/:id/amalan') circleAmalan(@Req() req:any,@Param('id') id:string,@Body() body:CircleAmalanDto){return this.data.updateCircleAmalan(req.user.id,id,body.amalanKeys)}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/amalan/custom') customCircleAmalan(@Req() req:any,@Param('id') id:string,@Body() body:CircleCustomAmalanDto){return this.data.addCustomCircleAmalan(req.user.id,id,body)}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/amalan/:key/remove') removeCircleAmalan(@Req() req:any,@Param('id') id:string,@Param('key') key:string){return this.data.removeCustomCircleAmalan(req.user.id,id,key)}
  @UseGuards(AccessGuard) @Get('v1/circles/:id/challenge') async circleChallenge(@Req() req:any,@Param('id') id:string){return{challenge:await this.data.circleChallenge(req.user.id,id)}}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/challenge') startCircleChallenge(@Req() req:any,@Param('id') id:string,@Body() body:CircleChallengeDto){return this.data.startCircleChallenge(req.user.id,id,body.challengeId)}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/encouragements') encourage(@Req() req:any,@Param('id') id:string,@Body() body:EncouragementDto) { return this.data.sendEncouragement(req.user.id,id,body.key); }
  @UseGuards(AccessGuard) @Post('v1/circles/:id/invites') invite(@Req() req:any,@Param('id') id:string,@Body() body:InviteDto) { return this.data.createInvite(req.user.id,id,body); }
  @UseGuards(AccessGuard) @Patch('v1/circles/:id/members/:memberId') memberAction(@Req() req:any,@Param('id') id:string,@Param('memberId') memberId:string,@Body() body:MemberActionDto){return this.data.updateMember(req.user.id,id,memberId,body.action)}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/leave') leaveCircle(@Req() req:any,@Param('id') id:string){return this.data.leaveCircle(req.user.id,id)}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/transfer') transferCircle(@Req() req:any,@Param('id') id:string,@Body() body:TransferDto){return this.data.transferOwnership(req.user.id,id,body.memberId)}
  @UseGuards(AccessGuard) @Post('v1/circles/:id/archive') archiveCircle(@Req() req:any,@Param('id') id:string){return this.data.archiveCircle(req.user.id,id)}
  @Get('v1/invites/:token') invitePreview(@Param('token') token:string){return this.data.getInvite(token)}
  @UseGuards(AccessGuard) @Post('v1/invites/:token/accept') acceptInvite(@Req() req:any,@Param('token') token:string){return this.data.acceptInvite(req.user.id,token)}
  @UseGuards(AccessGuard) @Post('v1/notifications/:id/read') readNotification(@Req() req:any,@Param('id') id:string){return this.data.markNotificationRead(req.user.id,id)}
  @UseGuards(AccessGuard) @Post('v1/notifications/read-all') readAll(@Req() req:any){return this.data.markAllNotificationsRead(req.user.id)}
  @UseGuards(AccessGuard) @Patch('v1/privacy') privacy(@Req() req:any,@Body() body: PrivacyDto) { return this.data.updatePrivacy(req.user.id,body.visibility); }
  @UseGuards(AccessGuard) @Patch('v1/preferences') preferences(@Req() req:any,@Body() body: PreferencesDto) { return this.data.updatePreferences(req.user.id,body); }
  @Get('v1/encouragements') encouragements(){return this.data.getEncouragements()}
  @Get('v1/journey/milestones') milestones(){return this.data.getMilestones()}
}

@Module({ controllers: [AuthController, AppController], providers: [DatabaseService, AuthV2Service, AccessGuard, DailyV2Service, AppDataV2Service, EmailService] })
export class AppModule {}
