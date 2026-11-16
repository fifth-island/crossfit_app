const anatomy = {
 front:[
 ['Shoulders','M75 87 Q53 86 45 108 L43 128 Q54 124 63 111Z'],
 ['Chest','M78 91 L106 98 L107 128 Q87 139 66 119Z'],
 ['Biceps','M44 131 Q39 143 36 166 L46 175 Q58 153 59 132Z'],
 ['Triceps','M61 124 L65 145 L54 169 L49 173 Q56 149 61 124Z'],
 ['Core','M81 136 Q96 140 107 135 L107 153 L86 153Z'],
 ['Core','M86 158 L107 158 L107 174 L86 174Z'],
 ['Core','M87 179 L107 179 L107 196 L89 194Z'],
 ['Core','M90 201 L107 201 L107 229 Q96 222 90 201Z'],
 ['Core','M67 136 L78 143 L83 195 L90 227 L73 212 L69 171Z'],
 ['Quads','M76 228 Q62 253 64 291 L70 331 Q86 321 86 278Z'],
 ['Quads','M82 232 L104 246 L98 297 Q93 318 91 333 L80 327 Q90 292 82 232Z'],
 ['Quads','M96 294 L96 341 L86 347 L83 336Z'],
 ['Calves','M70 362 Q65 382 73 411 L80 445 L86 445 L83 381Z'],
 ['Calves','M93 360 L91 405 L88 444 L84 444 L84 387Z']
 ],
 back:[
 ['Upper back','M91 77 L106 91 L107 146 L79 119 L68 97Z'],
 ['Shoulders','M66 92 Q45 94 43 122 L60 129 L77 114Z'],
 ['Triceps','M45 132 L59 133 Q61 157 48 178 L37 168Z'],
 ['Lats','M65 124 L102 149 L88 196 L73 204 L68 166Z'],
 ['Lower back','M105 151 L107 221 L86 222 L92 197Z'],
 ['Glutes','M76 214 Q63 226 64 247 Q77 266 105 253 L106 225 Q88 213 76 214Z'],
 ['Hamstrings','M65 259 L84 266 L80 304 L70 344 Q62 309 65 259Z'],
 ['Hamstrings','M89 266 L103 259 L98 308 L91 346 L78 344 Q88 309 89 266Z'],
 ['Calves','M71 360 Q58 379 74 410 L81 416 L82 374Z'],
 ['Calves','M86 358 Q100 380 89 410 L83 417 L83 376Z']
 ]
};
export function bodySVG(side,counts,selected){
 const silhouette='M97 22 Q110 15 123 22 Q137 28 134 48 L130 63 L122 71 L122 81 Q133 86 153 91 Q169 93 175 111 L184 153 L189 179 L201 218 L206 238 Q204 249 197 241 L189 226 L185 219 L176 199 L165 176 L157 148 L150 139 L149 177 L146 206 Q156 228 156 251 L154 294 L148 342 L150 366 Q158 388 149 418 L143 447 L143 465 L150 475 Q151 483 137 483 L126 480 L126 458 L123 424 L124 390 L120 365 L122 340 L115 300 L110 278 L105 300 L98 340 L100 365 L96 390 L97 424 L94 458 L94 480 L83 483 Q69 483 70 475 L77 465 L77 447 L71 418 Q62 388 70 366 L72 342 L66 294 L64 251 Q64 228 74 206 L71 177 L70 139 L63 148 L55 176 L44 199 L35 219 L31 226 L23 241 Q16 249 14 238 L19 218 L31 179 L36 153 L45 111 Q51 93 67 91 Q87 86 98 81 L98 71 L90 63 L86 48 Q83 28 97 22Z';
  let muscles='';for(const [name,d] of anatomy[side])for(const mirror of [false,true])muscles+=`<path d="${d}" ${mirror?'transform="translate(220 0) scale(-1 1)"':''} data-muscle="${name}" tabindex="0" role="button" aria-pressed="${selected===name}" aria-label="${name}: ${counts[name]} sessions" class="muscle heat-${Math.min(counts[name],3)}${selected===name?' selected':''}"><title>${name} · ${counts[name]} sessions</title></path>`;
 return `<svg viewBox="0 0 220 500" class="body-svg" aria-label="${side} muscle map"><path d="${silhouette}" class="silhouette"/><path d="M110 82 L110 257 M84 454 L92 454 M128 454 L136 454" class="body-line"/>${muscles}<path d="M38 178 L25 220 M182 178 L195 220" class="body-limb"/></svg>`;
}
