import {loadPortal} from '$lib/server/portal';
export async function load(event){const value=event.url.searchParams.get('range');const range=['7d','30d'].includes(value)?value:'today';return {...await loadPortal(event,range),range};}
