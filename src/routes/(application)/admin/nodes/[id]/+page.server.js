import {loadAdmin,adminAction} from '$lib/server/admin';
export const load=event=>loadAdmin(event,'nodes',event.params.id);
export const actions={default:adminAction};
