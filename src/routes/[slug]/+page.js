import { error } from '@sveltejs/kit';
const slugs = ['how-it-works','our-mission','community','get-involved'];
export function entries(){return slugs.map(slug=>({slug}))}
export function load({params}){if(!slugs.includes(params.slug))error(404,'Page not found');return {slug:params.slug}}
