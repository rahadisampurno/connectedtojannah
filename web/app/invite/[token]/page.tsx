import { InviteFlow } from '../../../components/invite-flow';
export default async function InvitePage({params}:{params:Promise<{token:string}>}){const{token}=await params;return <InviteFlow token={token}/>}
