// This checks script delivery only; it cannot certify a rendered Google map.
const key=process.env.GOOGLE_MAPS_BROWSER_KEY;
if(!key){console.error('Google Maps browser key is missing.');process.exitCode=1;}
else try{
 const url=new URL('https://maps.googleapis.com/maps/api/js');url.search=new URLSearchParams({key,v:'quarterly',loading:'async'}).toString();
 const response=await fetch(url,{headers:{Referer:'http://localhost:5173/'},signal:AbortSignal.timeout(20000),redirect:'error'});
 const body=await response.text();
 const knownError=body.match(/(?:InvalidKeyMapError|RefererNotAllowedMapError|ApiNotActivatedMapError|BillingNotEnabledMapError|ExpiredKeyMapError)/)?.[0];
 if(!response.ok||knownError){console.error('Google loader check failed:',knownError||'HTTP '+response.status);process.exitCode=1;}
 else console.log('Google Maps script delivery passed (HTTP '+response.status+'). Rendered map authentication, imagery and markers still require browser verification.');
}catch{console.error('Google Maps loader could not be reached.');process.exitCode=1;}
