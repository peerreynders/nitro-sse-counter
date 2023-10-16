!function(){"use strict";
/*! (c) Andrea Giammarchi - ISC */const e=!0,t=!1,s="querySelectorAll",n="querySelectorAll",{document:r,Element:o,MutationObserver:i,Set:a,WeakMap:c}=self,u=e=>n in e,{filter:d}=[];const l=new Map,b=[],f=self.document,v=(l=>{const b=new c,f=(e,t)=>{let s;if(t)for(let n,r=(e=>e.matches||e.webkitMatchesSelector||e.msMatchesSelector)(e),o=0,{length:i}=h;o<i;o++)r.call(e,n=h[o])&&(b.has(e)||b.set(e,new a),s=b.get(e),s.has(n)||(s.add(n),l.handle(e,t,n)));else b.has(e)&&(s=b.get(e),b.delete(e),s.forEach((s=>{l.handle(e,t,s)})))},v=(e,t=!0)=>{for(let s=0,{length:n}=e;s<n;s++)f(e[s],t)},{query:h}=l,m=l.root||r,k=((n,r=document,o=MutationObserver,i=["*"])=>{const a=(t,r,o,i,c,u)=>{for(const d of t)(u||s in d)&&(c?o.has(d)||(o.add(d),i.delete(d),n(d,c)):i.has(d)||(i.add(d),o.delete(d),n(d,c)),u||a(d[s](r),r,o,i,c,e))},c=new o((s=>{if(i.length){const n=i.join(","),r=new Set,o=new Set;for(const{addedNodes:i,removedNodes:c}of s)a(c,n,r,o,t,t),a(i,n,r,o,e,t)}})),{observe:u}=c;return(c.observe=t=>u.call(c,t,{subtree:e,childList:e}))(r),c})(f,m,i,h),{attachShadow:A}=o.prototype;return A&&(o.prototype.attachShadow=function(e){const t=A.call(this,e);return k.observe(t),t}),h.length&&v(m[n](h)),{drop:e=>{for(let t=0,{length:s}=e;t<s;t++)b.delete(e[t])},flush:()=>{const e=k.takeRecords();for(let t=0,{length:s}=e;t<s;t++)v(d.call(e[t].removedNodes,u),!1),v(d.call(e[t].addedNodes,u),!0)},observer:k,parse:v}})({query:b,root:f,handle(e,t,s){const n=l.get(s);n&&(t?n.mounted:n.unmounted)?.(e)}}),h=(e,t)=>{const s="."+e;b.includes(s)||(b.push(s),l.set(s,t),v.parse(f.querySelectorAll(s)))},m={UNAVAILABLE:-1,WAIT:0,READY:1},k="js:c-count--disabled";function A(e,t){const s=new WeakMap,n={mounted(n){if(!(n instanceof HTMLElement))return;const r=function(e){const t=e.firstChild;if(t instanceof Text)return t;const s=new Text("");return t?e.replaceChild(s,t):e.appendChild(s),s}(n),o={root:n,text:r,disabled:n.classList.contains(k),unsubscribes:[]};o.unsubscribes[0]=e((e=>function(e,t){e.text.nodeValue=String(t)}(o,e))),o.unsubscribes[1]=t((e=>function(e,t){t!==m.UNAVAILABLE?e.disabled&&(e.disabled=!1,e.root.classList.remove(k)):e.disabled||(e.disabled=!0,e.root.classList.add(k))}(o,e))),s.set(n,o)},unmounted(e){const t=s.get(e);if(t){for(const e of t.unsubscribes)e();s.delete(e)}}};return n}const L="js:c-status--error",p=()=>{};function g(e){const t=new WeakMap;return{mounted(s){if(!(s instanceof HTMLParagraphElement))return;const n={root:s,text:new Text(""),unsubscribe:p};n.root.appendChild(n.text),n.unsubscribe=e((e=>function(e,t){t.error&&e.root.classList.add(L),e.text.nodeValue=t.message}(n,e))),t.set(s,n)},unmounted(e){const s=t.get(e);s&&(s.unsubscribe(),t.delete(e))}}}const E="js:c-trigger--disabled",w="js:c-trigger--wait",S=()=>{};function N(e,t){const s=new WeakMap;return{mounted(n){if(!(n instanceof HTMLButtonElement))return;const r={root:n,disabled:!1,click:()=>{r.disabled||e()},unsubscribe:S};r.unsubscribe=t((e=>function(e,t){switch(t){case m.UNAVAILABLE:return e.root.classList.remove(w),e.disabled=!0,e.root.classList.add(E),void e.root.setAttribute("aria-disabled","true");case m.WAIT:return e.root.classList.add(w),e.disabled=!0,e.root.classList.add(E),void e.root.setAttribute("aria-disabled","true");default:return e.root.classList.remove(w),e.disabled=!1,e.root.classList.remove(E),void e.root.removeAttribute("aria-disabled")}}(r,e))),s.set(n,r),r.root.addEventListener("click",r.click)},unmounted(e){const t=s.get(e);t&&(t.unsubscribe(),t.root.removeEventListener("click",t.click),s.delete(e))}}}function M(e,t){e.addEventListener("message",t),e.addEventListener("error",t)}function y(e){const t={status:void 0,href:e,sink:void 0,source:void 0,handleEvent(e){var t;if(this.sink&&!1!==this.status)return e instanceof MessageEvent?(this.status=!0,void function(e,t){const s=Number(t.data);if(Number.isNaN(s))return;e({kind:"update",count:s})}(this.sink,e)):void("error"===e.type&&(!0===this.status?(0,this.sink)({kind:"end"}):function(e){e({kind:"error",reason:"Failed to open connection"})}(this.sink),(t=this).source&&(t.source.removeEventListener("message",t),t.source.removeEventListener("error",t),t.source.readyState<2&&t.source.close()),t.source=void 0,t.sink=void 0,t.status=!1))}};return{start:()=>{t.source=new EventSource(t.href),t.sink&&M(t.source,t)},subscribe:e=>{const s=t.sink;return t.sink=e,!s&&t.source&&M(t.source,t),()=>{t.sink===e&&(t.sink=void 0)}}}}class I{sinks=new Set;add=e=>(this.sinks.add(e),()=>{this.sinks.delete(e)});send=e=>{for(const t of this.sinks)t(e)};sendSkip=(e,t)=>{for(const s of this.sinks)s!==t&&s(e)}}function T({inbound:e,outbound:t}){const s=function(){let e;return{send:t=>{e&&e(t)},subscribe:t=>(e=t,()=>{e===t&&(e=void 0)})}}(),n=function(e){let t={error:!0,message:"Connection failed. Reload to retry."};const s=new I,n={available:m.READY,messageSink:e=>{switch(e.kind){case"end":t={error:!1,message:"Count complete. Reload to restart."};break;case"error":break;default:return}n.sendAvailable(m.UNAVAILABLE)},sendAvailable:r=>{t&&(n.available=r,s.send(r),r===m.UNAVAILABLE&&(e(t),t=void 0))},subscribe:e=>{const t=s.add(e);return e(n.available),t}};return n}(s.send),r=function(e,t,s){let n,r;const o=e=>{switch(e.kind){case"update":return n&&n(e.count),void s(m.READY);case"error":case"end":return r&&r(),void t(e)}},i={subscribe:e=>(n=e,()=>{n===e&&(n=void 0)}),unsubscribe:(()=>{const t=e(o);return()=>{i.unsubscribe=r=void 0,t()}})()};return i}(e.subscribe,n.messageSink,n.sendAvailable),o=function(e,t){const s=e=>{e||t(m.UNAVAILABLE)};let n=!1;return{availableSink:e=>{n||e===m.UNAVAILABLE&&(n=!0)},unsubscribe:void 0,dispatch(){n||(t(m.WAIT),e().then(s))}}}(t.increment,n.sendAvailable);return o.unsubscribe=n.subscribe(o.availableSink),{increment:o.dispatch,start:e.start,subscribeAvailable:n.subscribe,subscribeStatus:s.subscribe,subscribeCount:r.subscribe}}var V,j;V=T({inbound:y("/api/counter"),outbound:(j="/api/increment",{increment:async()=>(await fetch(j,{method:"POST"})).ok})}),h("js\\:c-count",A(V.subscribeCount,V.subscribeAvailable)),h("js\\:c-status",g(V.subscribeStatus)),h("js\\:c-trigger",N(V.increment,V.subscribeAvailable)),V.start()}();
