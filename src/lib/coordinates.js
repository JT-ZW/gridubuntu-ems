export function coordinates(latitude,longitude){
 const blank=v=>v===null||v===undefined||String(v).trim()==='';
 if(blank(latitude)&&blank(longitude))return {latitude:null,longitude:null};
 if(blank(latitude)||blank(longitude))throw new Error('Enter both latitude and longitude, or leave both blank.');
 const lat=Number(latitude),lng=Number(longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat > 90||lng < -180||lng > 180)throw new Error('Enter latitude from -90 to 90 and longitude from -180 to 180.');
 return {latitude:lat,longitude:lng};
}
