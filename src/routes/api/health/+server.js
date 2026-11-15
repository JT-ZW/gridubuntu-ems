import {json} from '@sveltejs/kit';
import {config,authConfigured} from '$lib/server/config';
export function GET(event){
 const c=config(event);const configured=authConfigured(event)&&Boolean(c.SUPABASE_SECRET_KEY||c.SUPABASE_SERVICE_ROLE_KEY)&&Boolean(c.NODE_CREDENTIAL_ENCRYPTION_KEY);
 return json({status:configured?'configured':'configuration_required'},{status:configured?200:503});
}
