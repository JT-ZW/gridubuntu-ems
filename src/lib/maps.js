let loading;
export function loadGoogleMaps(key){
 if(window.google?.maps?.importLibrary)return Promise.resolve(window.google.maps);
 if(loading)return loading;
 window.gm_authFailure=()=>window.dispatchEvent(new Event('gridubuntu:maps-auth-failed'));
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');let timer;
  const cleanup=()=>{clearTimeout(timer);delete window.gridUbuntuMapsReady;};
  const failed=()=>{cleanup();script.remove();loading=null;reject(new Error('Google Maps could not load. Check the browser key, website restrictions, Maps JavaScript API and billing, then try again.'));};
  window.gridUbuntuMapsReady=()=>{cleanup();resolve(window.google.maps);};
  const params=new URLSearchParams({key,v:'quarterly',loading:'async',callback:'gridUbuntuMapsReady',auth_referrer_policy:'origin'});
  script.src='https://maps.googleapis.com/maps/api/js?'+params;
  script.async=true;script.onerror=failed;script.referrerPolicy='strict-origin-when-cross-origin';
  timer=setTimeout(failed,20000);document.head.append(script);
 });return loading;
}
