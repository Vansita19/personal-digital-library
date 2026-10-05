import type { Book } from '../data/library';
const books: Book[] = JSON.parse(document.querySelector('#library-data')!.textContent!);
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
type Entry = { notes: string; status: string; words: { word: string; meaning: string }[] };
const storageKey = 'vansita-reading-room-v1';
let saved: Record<string, Entry> = {};
let storageAvailable = true;
try {
  const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const book of books) {
      const entry = raw[book.id];
      if (!entry || typeof entry !== 'object') continue;
      saved[book.id] = {
        notes: typeof entry.notes === 'string' ? entry.notes : '',
        status: ['Reading', 'Read', 'To read', 'On shelf'].includes(entry.status) ? entry.status : book.status,
        words: Array.isArray(entry.words) ? entry.words.filter((word: any) => typeof word?.word === 'string' && typeof word?.meaning === 'string') : [],
      };
    }
  }
} catch { storageAvailable = false; }
const entryFor = (book: Book): Entry => saved[book.id] ??= {notes:'', status:book.status, words:[]};
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); storageAvailable = true; }
  catch { storageAvailable = false; }

}

const cards = [...document.querySelectorAll<HTMLElement>('.book-card')];
let statusFilter = 'All books';
const collectionGrid = $('#book-grid');
const priority: Record<string, number> = {'Design':0,'Creativity':1,'Life & ideas':2,'Philosophy':3,'Memoir':4,'Fiction':5,'Fantasy':6,'Science fiction':7,'Classics':8,'Reference':9};
const shelfOrder = cards.slice().sort((a,b) => (priority[a.dataset.category!] ?? 10) - (priority[b.dataset.category!] ?? 10));
const shelfOverrides: Record<string, number> = {'five-point-someone':1,'great-big-beautiful-life':1,'mother-mary-comes-to-me':1,'everything-i-know-about-love':1,'beyond-good-and-evil':2};
const shelfGroups = [0,1,2].map(group => shelfOrder.filter((card,index) => (shelfOverrides[card.dataset.book!] ?? Math.min(2, Math.floor(index/18))) === group));
const shelfRows = ['Design & ideas', 'Stories', 'Others'].map((label, index) => {
  const row = document.createElement('section');
  row.className = 'shelf-row';
  row.setAttribute('aria-label', label);
  const heading = document.createElement('h3');
  heading.className = 'shelf-label'; heading.textContent = label;
  const scroll = document.createElement('div'); scroll.className = 'shelf-scroll';
  const deck = document.createElement('div'); deck.className = 'shelf-deck';
  scroll.append(deck); row.append(heading,scroll);
  return {row,deck,books:shelfGroups[index]};
});
function arrangeShelves() {
  if (!collectionGrid.classList.contains('is-shelf')) return;
  shelfRows.forEach(({row,deck,books:rowBooks}, rowIndex) => {
    const visible = rowBooks.filter(card => !card.hidden);
    row.hidden = visible.length === 0;
    let cursor = 20;
    let stackHeight = 0;
    visible.forEach((card, index) => {
      const stackStart = rowIndex % 2 === 0 ? 3 : 0;
      const stack = index >= stackStart && index < stackStart+3;
      const secondStack = index >= 11 && index < 14;
      const tier = stack ? index-stackStart : secondStack ? index-11 : 0;
      const horizontal = stack || secondStack;
      card.classList.toggle('shelf-horizontal',horizontal);
      card.style.setProperty('--shelf-x',`${cursor}px`);
      const depth = parseFloat(getComputedStyle(card.querySelector('.book-object')!).getPropertyValue('--thickness')) || 32;
      card.style.setProperty('--shelf-depth', `${depth}px`);
      card.style.setProperty('--shelf-lean', `${depth < 20 ? 0 : index % 9 === 6 ? -5 : index % 9 === 7 ? -3 : 0}deg`);
      if (tier === 0) stackHeight = 0;
      card.style.setProperty('--stack-y',`${stackHeight}px`);
      if (horizontal) stackHeight += depth + 2;
      if (!horizontal || tier===2 || index===visible.length-1) cursor += horizontal ? 212 : depth + 13;
    });
    deck.style.setProperty('--deck-width',`${cursor+20}px`);
    deck.style.setProperty('--group-width',`${cursor+20}px`);
  });
}
function mountCollection(shelf: boolean) {
  if (shelf) {
    shelfRows.forEach(({row,deck,books:rowBooks}) => {
      collectionGrid.append(row); rowBooks.forEach(card => deck.append(card));
    });
    arrangeShelves();
  } else {
    cards.forEach(card => {card.classList.remove('shelf-horizontal'); collectionGrid.append(card);});
    shelfRows.forEach(({row}) => row.remove());
  }
}

function updateCollection() {
  const query = $<HTMLInputElement>('#book-search').value.trim().toLocaleLowerCase();
  const category = $<HTMLSelectElement>('#category-filter').value;
  let count = 0;
  const totals: Record<string, number> = {'All books':books.length, Reading:0, Read:0, 'To read':0, 'On shelf':0};
  cards.forEach((card, index) => {
    const status = saved[books[index].id]?.status || books[index].status;
    totals[status]++;
    card.dataset.status = status;
    card.hidden = !(card.dataset.search!.includes(query) && (category === 'all' || category === card.dataset.category) && (statusFilter === 'All books' || status === statusFilter));
    if (!card.hidden) count++;
  });
  document.querySelectorAll<HTMLElement>('[data-status-count]').forEach(el => el.textContent = String(totals[el.dataset.statusCount!]));
  $('#result-count').textContent = `${count} ${count === 1 ? 'book' : 'books'}`;
  $('#empty-state').hidden = count !== 0;
  arrangeShelves();
}
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => {
  statusFilter = button.dataset.filter!;
  document.querySelectorAll('[data-filter]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  updateCollection();
}));
$('#book-search').addEventListener('input', updateCollection);
$('#category-filter').addEventListener('change', updateCollection);
$('#reset-filters').addEventListener('click', () => {
  $<HTMLInputElement>('#book-search').value = '';
  $<HTMLSelectElement>('#category-filter').value = 'all';
  $<HTMLButtonElement>('[data-filter="All books"]').click();
});
// The same cards move between layouts, retaining search, notes and book actions.
cards.forEach((card, index) => {
  card.style.viewTransitionName = `library-book-${index}`;
  card.style.setProperty('--shelf-height', `${books[index].id === "answer-book" ? 164 : 120 + (index * 17 % 29)}px`);
  card.style.setProperty('--shelf-lean', `${index % 9 === 6 ? -7 : index % 9 === 7 ? -4 : 0}deg`);
});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const grid = $('#book-grid');
    const applyView = () => {
      grid.classList.toggle('is-list', button.dataset.view === 'list');
      grid.classList.toggle('is-shelf', button.dataset.view === 'shelf');
      mountCollection(button.dataset.view === 'shelf');
      document.querySelectorAll('[data-view]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    };
    const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motion && 'startViewTransition' in document) {
      (document as Document & {startViewTransition: (update: () => void) => unknown}).startViewTransition(applyView);
    } else {
      applyView();
    }
  });
});
updateCollection();

// A continuous, curved gallery. Pointer movement drives position directly;
// release carries momentum before gently settling on a book.
const featured = books;
const featureButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-feature]')];
const showcase = $('.showcase');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let featuredIndex = 0;
let position = 0;
let velocity = 0;
let target: number | null = null;
let frame = 0;
let previousTime = 0;
let keyboardNavigation = false;
let galleryWidth = showcase.clientWidth;
let galleryHeight = showcase.clientHeight;
let galleryDrag: {id:number; x:number; y:number; start:number; lastX:number; lastTime:number; moved:boolean; book:number | null} | null = null;
const wrap = (value: number, size: number) => ((value % size) + size) % size;
const spacing = () => galleryWidth < 650 ? 245 : Math.min(410, Math.max(290, galleryWidth * .30));
function renderGallery() {
  const mobile = galleryWidth < 650;
  const size = mobile ? 185 : Math.min(300, Math.max(240, galleryWidth * .23));
  const nearest = wrap(Math.round(position), featured.length);
  showcase.style.setProperty('--hero-book-width', `${size}px`);
  featureButtons.forEach((button,index) => {
    const offset = wrap(index-position+featured.length/2,featured.length)-featured.length/2;
    const visible = Math.abs(offset) < 3.2;
    button.style.visibility = visible ? 'visible' : 'hidden';
    button.setAttribute('aria-hidden', String(!visible));
    button.tabIndex = index === nearest ? 0 : -1;
    button.dataset.active = String(index === nearest);
    if (!visible) return;
    const x = galleryWidth * (mobile ? .49 : .46) + offset * spacing();
    const desiredY = galleryHeight * .50 - offset * (mobile ? 75 : 105) - offset*offset*12;
    const scale = 1.14 - Math.min(Math.abs(offset)*.18,.34);
    const angle = -14 + offset*8;
    // Reserve the whole rotating volume, including page depth and floating motion.
    const radius = Math.hypot(size, size*1.45) * scale / 2 + 36;
    const y = Math.max(radius, Math.min(galleryHeight-radius, desiredY));
    button.style.transform = `translate3d(${x-size/2}px,${y-size*.725}px,0) rotateZ(${angle}deg) scale(${scale})`;
    button.style.zIndex = String(20-Math.round(Math.abs(offset)*3));
  });
  if (nearest !== featuredIndex || !showcase.dataset.ready) {
    featuredIndex = nearest;
    $('#featured-title').textContent = featured[nearest].title;
    $('#featured-author').textContent = featured[nearest].author;
    $('#featured-count').textContent = `${String(nearest+1).padStart(2,'0')} / ${featured.length}`;
  }
  showcase.dataset.ready = 'true';
  showcase.dataset.position = position.toFixed(3);
}
function animateGallery(time: number) {
  frame = 0;
  const dt = previousTime ? Math.min((time-previousTime)/16.67,2) : 1;
  previousTime = time;
  if (galleryDrag) return;
  if (target !== null) {
    const distance = target-position;
    position += distance * (reducedMotion.matches ? 1 : 1-Math.pow(.79,dt));
    if (Math.abs(distance)<.001) {position=target;target=null;velocity=0;}
  } else {
    position += velocity*dt;
    velocity *= Math.pow(.93,dt);
    if (Math.abs(velocity)<.008) target=Math.round(position);
  }
  renderGallery();
  if (target !== null || Math.abs(velocity)>.001) frame=requestAnimationFrame(animateGallery);
  else {
    previousTime=0;
    if (keyboardNavigation) {featureButtons[featuredIndex].focus({preventScroll:true});keyboardNavigation=false;}
  }
}
function startGalleryMotion() {if (!frame) frame=requestAnimationFrame(animateGallery);}
showcase.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary) return;
  keyboardNavigation=false;
  cancelAnimationFrame(frame);frame=0;previousTime=0;velocity=0;target=null;
  const book = (event.target as HTMLElement).closest<HTMLElement>('[data-feature]');
  galleryDrag={id:event.pointerId,x:event.clientX,y:event.clientY,start:position,lastX:event.clientX,lastTime:performance.now(),moved:false,book:book ? Number(book.dataset.feature) : null};
  showcase.setPointerCapture(event.pointerId);
});
showcase.addEventListener('pointermove', event => {
  if (!galleryDrag || galleryDrag.id!==event.pointerId) return;
  const dx=event.clientX-galleryDrag.x;
  if (Math.abs(dx)>5) {galleryDrag.moved=true;showcase.classList.add('is-dragging');}
  if (!galleryDrag.moved) return;
  const now=performance.now();
  const sample=-(event.clientX-galleryDrag.lastX)/spacing()*16.67/Math.max(now-galleryDrag.lastTime,8);
  velocity=velocity*.35+Math.max(-.18,Math.min(.18,sample))*.65;
  position=galleryDrag.start-dx/spacing();
  galleryDrag.lastX=event.clientX;galleryDrag.lastTime=now;
  renderGallery();
});
function endGalleryDrag(event: PointerEvent) {
  if (!galleryDrag || galleryDrag.id!==event.pointerId) return;
  const state=galleryDrag;galleryDrag=null;
  showcase.classList.remove('is-dragging');
  if (showcase.hasPointerCapture(event.pointerId)) showcase.releasePointerCapture(event.pointerId);
  if (event.type==='pointerup' && !state.moved && Math.abs(event.clientY-state.y)<6 && state.book!==null) {
    openBook(featured[state.book]);return;
  }
  if (performance.now()-state.lastTime>90 || reducedMotion.matches || event.type!=='pointerup') velocity=0;
  if (Math.abs(velocity)<.008) target=Math.round(position);
  startGalleryMotion();
}
showcase.addEventListener('pointerup',endGalleryDrag);
showcase.addEventListener('pointercancel',endGalleryDrag);
showcase.addEventListener('lostpointercapture',endGalleryDrag);
showcase.addEventListener('dragstart',event=>event.preventDefault());
showcase.addEventListener('keydown',event=>{
  if (event.key==='Enter' && event.target===showcase) {event.preventDefault();openBook(featured[featuredIndex]);return;}
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();velocity=0;keyboardNavigation=true;
  target=event.key==='Home' ? 0 : event.key==='End' ? featured.length-1 : (target ?? Math.round(position))+(event.key==='ArrowRight' ? 1 : -1);
  startGalleryMotion();
});
// Horizontal trackpad gestures browse; vertical gestures continue down the page.
showcase.addEventListener('wheel',event=>{
  if (Math.abs(event.deltaX)<=Math.abs(event.deltaY) || Math.abs(event.deltaX)<1) return;
  event.preventDefault();keyboardNavigation=false;position+=event.deltaX/spacing();velocity=0;target=Math.round(position);
  renderGallery();startGalleryMotion();
},{passive:false});
new ResizeObserver(()=>{galleryWidth=showcase.clientWidth;galleryHeight=showcase.clientHeight;renderGallery();}).observe(showcase);
renderGallery();
let paused = reducedMotion.matches;
function updateMotion() {
  const stopped=paused || reducedMotion.matches || document.hidden;
  document.body.classList.toggle('motion-paused',stopped);
  $('#motion-toggle').textContent=stopped ? '▷' : 'Ⅱ';
  $('#motion-toggle').setAttribute('aria-label',stopped ? 'Resume motion' : 'Pause motion');
  $('#motion-toggle').setAttribute('aria-pressed',String(stopped));
  $<HTMLButtonElement>('#motion-toggle').disabled=reducedMotion.matches;
}
$('#motion-toggle').addEventListener('click',()=>{paused=!paused;updateMotion();});
reducedMotion.addEventListener('change',()=>{paused=reducedMotion.matches;updateMotion();});
document.addEventListener('visibilitychange',updateMotion);
updateMotion();

const dialog = $<HTMLDialogElement>('#book-dialog');
let activeBook = books[0];
function openBook(book: Book) {
  activeBook = book;
  const entry = entryFor(book);
  $('#detail-title').textContent = book.title;
  $('#detail-author').textContent = book.author;
  $('#detail-category').textContent = book.category;
  $('#detail-description').textContent=book.description;
  $('#detail-description').hidden=!book.description;
  $('#detail-rating').textContent = book.rating ? '★'.repeat(book.rating) + '☆'.repeat(5-book.rating) + ' · My rating' : '';
  $('#detail-rating').hidden = !book.rating;
  const cover = $(`[data-book="${book.id}"] .book-object`).cloneNode(true);
  $('#detail-book').replaceChildren(cover);
  $<HTMLTextAreaElement>('#book-notes').value = entry.notes;
  $<HTMLSelectElement>('#detail-status').value = entry.status;
  dialog.showModal(); document.body.style.overflow = 'hidden';
  $('.dialog-close').focus({preventScroll:true});
}
document.querySelectorAll<HTMLElement>('[data-open]').forEach(button => button.addEventListener('click', () => openBook(books.find(book => book.id === button.dataset.open)!)));
featureButtons.forEach((button,index)=>button.addEventListener('click',event=>{if (event.detail===0) openBook(featured[index]);}));
let closing = false;
async function closeBook() {
  if (closing || !dialog.open) return;
  closing = true;
  if (!reducedMotion.matches) {
    await dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(24px) scale(.97)'}],{duration:200,easing:'ease-in',fill:'forwards'}).finished;
  }
  dialog.close(); dialog.getAnimations().forEach(animation=>animation.cancel()); closing=false;
}
$('.dialog-close').addEventListener('click', closeBook);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeBook();});
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closeBook();
});
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
$('#book-notes').addEventListener('input', () => {entryFor(activeBook).notes = $<HTMLTextAreaElement>('#book-notes').value; persist();});
$('#detail-status').addEventListener('change', () => {entryFor(activeBook).status = $<HTMLSelectElement>('#detail-status').value; persist(); updateCollection();});
