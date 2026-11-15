import {loadAdmin,adminAction} from '$lib/server/admin';
export const load=event=>loadAdmin(event,event.params.section);
export const actions={default:adminAction};
