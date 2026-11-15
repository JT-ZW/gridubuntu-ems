import {loadAdmin,adminAction} from '$lib/server/admin';
export const load=event=>loadAdmin(event);
export const actions={default:adminAction};
