// Put overflowing tables in the keyboard tab order, without adding desktop tab stops.
export function keyboardScroll(node){
 const update=()=>{node.tabIndex=node.scrollWidth>node.clientWidth+1?0:-1;};
 const resize=new ResizeObserver(update);resize.observe(node);if(node.firstElementChild)resize.observe(node.firstElementChild);
 const mutation=new MutationObserver(update);mutation.observe(node,{childList:true,subtree:true,characterData:true});update();
 return {destroy(){resize.disconnect();mutation.disconnect();}};
}
