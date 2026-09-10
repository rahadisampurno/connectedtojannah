import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class EmailService {
  async send(to:string,subject:string,html:string){
    const apiKey=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
    if(!apiKey||!from){
      if(process.env.NODE_ENV==='production')throw new ServiceUnavailableException({code:'EMAIL_NOT_CONFIGURED',message:'Layanan email belum dikonfigurasi.'});
      return false;
    }
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html})});
    if(!response.ok)throw new ServiceUnavailableException({code:'EMAIL_DELIVERY_FAILED',message:'Email belum berhasil dikirim. Silakan coba kembali.'});
    return true;
  }
}
