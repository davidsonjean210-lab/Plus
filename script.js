import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVRkOh1x2QSmn_SuuNlYEF51FNNj1oapk",
    authDomain: "plus-7bb95.firebaseapp.com",
    projectId: "plus-7bb95",
    storageBucket: "plus-7bb95.firebasestorage.app",
    messagingSenderId: "794281987667",
    appId: "1:794281987667:web:4416005ed2b652893ec0a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null; 
let datosMiPerfilGlobal = null;
let usuariosGlobales = [];
let cacheTodosLosPosts = [];
let desubscribirPosts = null;
let desubscribirUsuarios = null;
let desubscribirNotif = null;
let desubscribirChatMensajes = null;
let desubscribirStories = null;

let chatUserUidActivo = null;
let temporizadorHistoria = null;
let perfilAjenoUidActivo = null;

// ==========================================
// NAVEGACIÓN Y VISTAS
// ==========================================
function mostrarMuro() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    navegarA('inicio');
}

function mostrarLogin() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-screen').classList.add('hidden');
    if(desubscribirPosts) desubscribirPosts();
    if(desubscribirUsuarios) desubscribirUsuarios();
    if(desubscribirNotif) desubscribirNotif();
    if(desubscribirStories) desubscribirStories();
    cerrarChatActivo();
    terminarVisorHistoria();
}

function navegarA(tab) {
    const tabs = ['inicio', 'buscar', 'publicar', 'explorar', 'perfil', 'notificaciones', 'mensajes', 'perfil-ajeno'];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const btnEl = document.getElementById(`btn-tab-${t}`);
        if(tabEl) tabEl.classList.add('hidden');
        if(btnEl) btnEl.classList.remove('active');
    });
    
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-tab-${tab}`);
    if(activeBtn) activeBtn.classList.add('active');

    if(tab === 'mensajes') cerrarChatActivo();
    if(tab !== 'perfil-ajeno') perfilAjenoUidActivo = null;
}

// ==========================================
// RENDERIZADO UI
// ==========================================
function dibujarPosts(listaDePosts, contenedorId = 'feed-container') {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    if (listaDePosts.length === 0) { contenedor.innerHTML = '<p style="color:var(--texto-gris); text-align:center;">Aún no hay publicaciones.</p>'; return; }
    let html = "";
    listaDePosts.forEach(post => {
        const likes = post.likes || [];
        const comments = post.comments || [];
        const yaDioLike = currentUser && likes.includes(currentUser.uid);

        let comentariosHtml = "";
        if(comments.length > 0) {
            comentariosHtml = `<div class="comment-section">`;
            comments.forEach(c => { comentariosHtml += `<div style="margin-bottom: 5px;"><b>@${c.username}:</b> <span style="color: var(--texto-gris);">${c.text}</span></div>`; });
            comentariosHtml += `</div>`;
        }

        html += `
            <div class="custom-card">
                <div class="card-top">
                    <span style="color: var(--texto-blanco); cursor:pointer; font-weight: bold;" onclick="verPerfilDe('${post.uid}')">@${post.username || "anonimo"}</span>
                    <span>Post</span>
                </div>
                <p class="card-main-text" style="font-weight:normal; font-size:15px; margin-top:8px;">${post.text}</p>
                <div class="action-bar">
                    <button class="action-btn ${yaDioLike ? 'liked' : ''}" onclick="ejecutarLike('${post.id}', '${post.uid}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${yaDioLike ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        ${likes.length}
                    </button>
                    <button class="action-btn" onclick="ejecutarComentar('${post.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        ${comments.length} Responder
                    </button>
                </div>
                ${comentariosHtml}
            </div>
        `;
    });
    contenedor.innerHTML = html;
}

function generarHtmlUsuario(user) {
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(user.uid);
    return `
        <div class="custom-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="cursor:pointer;" onclick="verPerfilDe('${user.uid}')">
                <span style="font-weight:bold; display:block; color:var(--texto-blanco);">@${user.username}</span>
                <small style="color:var(--texto-gris);">${user.bio || 'Nuevo en plus.'}</small>
            </div>
            <button class="btn-follow-action ${yaLoSigo ? 'following' : ''}" onclick="ejecutarSeguir('${user.uid}')">
                ${yaLoSigo ? 'Siguiendo' : 'Seguir'}
            </button>
        </div>
    `;
}

function dibujarUsuarios() {
    const contenedor = document.getElementById('users-container');
    const otros = usuariosGlobales.filter(u => u.uid !== currentUser.uid);
    if (otros.length === 0) { contenedor.innerHTML = '<p>Sin recomendaciones.</p>'; return; }
    let html = ""; otros.forEach(user => { html += generarHtmlUsuario(user); });
    contenedor.innerHTML = html;
    
    dibujarListaContactosChat(otros);
}

function dibujarListaContactosChat(listaOtrosUsuarios) {
    const contenedor = document.getElementById('chat-users-list');
    if(listaOtrosUsuarios.length === 0) { contenedor.innerHTML = '<p style="color:var(--texto-gris);">No hay usuarios disponibles.</p>'; return; }
    let html = "";
    listaOtrosUsuarios.forEach(u => {
        html += `
            <div class="custom-card" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="entrarAlChat('${u.uid}', '${u.username}')">
                <div>
                    <span style="font-weight:bold; color:var(--texto-blanco);">@${u.username}</span>
                    <small style="display:block; color:var(--texto-gris);">Toca para abrir chat privado</small>
                </div>
                <span style="color: var(--azul-pulses);">💬</span>
            </div>
        `;
    });
    contenedor.innerHTML = html;
}

function dibujarMiPerfil() {
    const contenedor = document.getElementById('profile-container');
    if(!datosMiPerfilGlobal) return;
    contenedor.innerHTML = `
        <div class="profile-card">
            <div class="avatar-circle"><svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" style="color: var(--texto-gris);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
            <h2 style="margin: 5px 0; font-size:24px;">@${datosMiPerfilGlobal.username}</h2>
            <p style="color: var(--texto-blanco); margin: 8px 0; font-size:15px;">${datosMiPerfilGlobal.bio || 'Sin biografía'}</p>
        </div>
        <div class="stats-row">
            <div class="stat-box"><span>${datosMiPerfilGlobal.followersCount || 0}</span><label>Seguidores</label></div>
            <div class="stat-box"><span>${datosMiPerfilGlobal.following?.length || 0}</span><label>Siguiendo</label></div>
        </div>
    `;
}

function dibujarNotificaciones(lista) {
    const contenedor = document.getElementById('notifications-container');
    if(lista.length === 0) {
        contenedor.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--texto-gris);">No tienes actividad reciente.</div>';
        return;
    }
    lista.sort((a, b) => (b.timestamp?.toMillis() || Date.now()) - (a.timestamp?.toMillis() || Date.now()));

    let html = "";
    lista.forEach(n => {
        let mensaje = n.type === 'like' ? `🚀 A ${n.fromUsername} le gustó tu pulso` : `👾 ${n.fromUsername} comenzó a seguirte`;
        html += `<div class="notif-item"><p class="notif-text">${mensaje}</p><p class="notif-time">NUEVO</p></div>`;
    });
    contenedor.innerHTML = html;
}

function dibujarHistoriasBarra(listaStories) {
    const contenedor = document.getElementById('stories-carousel-container');
    let html = `
        <div>
            <div class="story-circle create" onclick="solicitarCrearHistoria()">＋</div>
            <div class="story-username">Tú</div>
        </div>
    `;

    const limite24Horas = Date.now() - (24 * 60 * 60 * 1000);
    const historiasValidas = listaStories.filter(s => {
        const t = s.timestamp ? s.timestamp.toMillis() : Date.now();
        return t > limite24Horas;
    });

    const usuariosVistos = [];
    historiasValidas.forEach(story => {
        if(!usuariosVistos.includes(story.uid)) {
            usuariosVistos.push(story.uid);
            html += `
                <div>
                    <div class="story-circle" onclick="lanzarVisorHistoria('${story.text.replace(/'/g, "\\'")}', '${story.username}')">
                        <span style="font-size:20px;">👤</span>
                    </div>
                    <div class="story-username" style="cursor:pointer;" onclick="verPerfilDe('${story.uid}')">@${story.username}</div>
                </div>
            `;
        }
    });

    contenedor.innerHTML = html;
}

// ==========================================
// VISUALIZACIÓN DE PERFIL DE TERCEROS
// ==========================================
function verPerfilUsuario(targetUid) {
    if(currentUser && targetUid === currentUser.uid) { navegarA('perfil'); return; }
    
    perfilAjenoUidActivo = targetUid;
    navegarA('perfil-ajeno');
    actualizarVistaPerfilAjeno();
}

function actualizarVistaPerfilAjeno() {
    if(!perfilAjenoUidActivo) return;
    const targetUser = usuariosGlobales.find(u => u.uid === perfilAjenoUidActivo);
    const contenedorPerfil = document.getElementById('user-profile-container');
    
    if(!targetUser) { contenedorPerfil.innerHTML = "<p>Usuario no encontrado.</p>"; return; }
    
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(targetUser.uid);
    
    contenedorPerfil.innerHTML = `
        <div class="profile-card">
            <div class="avatar-circle"><svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" style="color: var(--texto-gris);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
            <h2 style="margin: 5px 0; font-size:24px;">@${targetUser.username}</h2>
            <p style="color: var(--texto-blanco); margin: 8px 0; font-size:15px;">${targetUser.bio || 'Sin biografía'}</p>
            <button class="btn-plus ${yaLoSigo ? 'btn-plus-sec' : ''}" style="width:auto; padding: 8px 24px; border-radius: 20px; margin-top: 10px;" onclick="ejecutarSeguir('${targetUser.uid}')">
                ${yaLoSigo ? '❌ Dejar de seguir' : '🤝 Seguir'}
            </button>
        </div>
        <div class="stats-row">
            <div class="stat-box"><span>${targetUser.followersCount || 0}</span><label>Seguidores</label></div>
            <div class="stat-box"><span>${targetUser.following?.length || 0}</span><label>Siguiendo</label></div>
        </div>
        <div class="seccion-titulo" style="margin-top:25px;">📝 Pulses de @${targetUser.username}</div>
    `;

    const postsFiltrados = cacheTodosLosPosts.filter(p => p.uid === targetUser.uid);
    dibujarPosts(postsFiltrados, 'user-feed-container');
}

// ==========================================
// LÓGICA DE HISTORIAS
// ==========================================
async function crearNuevaHistoria(texto) {
    try {
        await addDoc(collection(db, "stories"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, timestamp: serverTimestamp() });
    } catch(e) { console.error("Error al crear historia:", e); }
}

function reproducirHistoria(texto, usuario) {
    terminarVisorHistoria();
    document.getElementById('story-viewer-username').innerText = `@${usuario}`;
    document.getElementById('story-viewer-content').innerText = texto;
    
    const visor = document.getElementById('story-viewer');
    const barraProgreso = document.getElementById('story-progress-bar');
    
    visor.classList.remove('hidden');
    barraProgreso.style.width = '0%';
    
    setTimeout(() => {
        barraProgreso.style.transition = 'width 4s linear';
        barraProgreso.style.width = '100%';
    }, 50);

    temporizadorHistoria = setTimeout(() => { terminarVisorHistoria(); }, 4050);
}

function terminarVisorHistoria() {
    if(temporizadorHistoria) { clearTimeout(temporizadorHistoria); temporizadorHistoria = null; }
    const barraProgreso = document.getElementById('story-progress-bar');
    if(barraProgreso) { barraProgreso.style.transition = 'none'; barraProgreso.style.width = '0%'; }
    const visor = document.getElementById('story-viewer');
    if(visor) visor.classList.add('hidden');
}

// ==========================================
// LÓGICA DE MENSAJERÍA
// ==========================================
async function abrirChatCon(targetUid, targetUsername) {
    chatUserUidActivo = targetUid;
    document.getElementById('chat-target-username').innerText = `@${targetUsername}`;
    document.getElementById('chat-list-view').classList.add('hidden');
    document.getElementById('chat-active-view').classList.remove('hidden');

    const chatIdCombinado = [currentUser.uid, targetUid].sort().join("_");
    const qMensajes = query(collection(db, "direct_messages"), where("chatId", "==", chatIdCombinado), orderBy("timestamp", "asc"));
    
    if(desubscribirChatMensajes) desubscribirChatMensajes();
    const boxMensajes = document.getElementById('chat-messages-container');
    boxMensajes.innerHTML = "<p style='color:var(--texto-gris); text-align:center;'>Cargando chat...</p>";

    desubscribirChatMensajes = onSnapshot(qMensajes, (snapshot) => {
        let html = "";
        snapshot.forEach(doc => {
            const msg = doc.data();
            const esMio = msg.senderUid === currentUser.uid;
            html += `<div class="chat-bubble ${esMio ? 'enviado' : 'recibido'}">${msg.text}</div>`;
        });
        boxMensajes.innerHTML = html || "<p style='color:var(--texto-gris); text-align:center; margin:auto;'>Di hola en este chat privado 👋</p>";
        boxMensajes.scrollTop = boxMensajes.scrollHeight;
    });
}

function cerrarChatActivo() {
    chatUserUidActivo = null;
    if(desubscribirChatMensajes) { desubscribirChatMensajes(); desubscribirChatMensajes = null; }
    document.getElementById('chat-list-view').classList.remove('hidden');
    document.getElementById('chat-active-view').classList.add('hidden');
}

async function enviarMensajePrivado(textoMensaje) {
    if(!chatUserUidActivo) return;
    const chatIdCombinado = [currentUser.uid, chatUserUidActivo].sort().join("_");
    try {
        await addDoc(collection(db, "direct_messages"), { chatId: chatIdCombinado, senderUid: currentUser.uid, text: textoMensaje, timestamp: serverTimestamp() });
    } catch(e) { console.error("Error:", e); }
}

// ==========================================
// INTERACCIONES GENERALES (LIKE, SEGUIR, COMENTAR)
// ==========================================
function buscarUsuarios() {
    const queryStr = document.getElementById('input-busqueda').value.toLowerCase();
    const contenedor = document.getElementById('resultados-busqueda');
    if(queryStr.length === 0) { contenedor.innerHTML = "Busca amigos o creadores..."; return; }
    const resultados = usuariosGlobales.filter(u => u.username.toLowerCase().includes(queryStr) && u.uid !== currentUser.uid);
    if(resultados.length === 0) { contenedor.innerHTML = "<p style='color:var(--texto-gris);'>No se encontraron usuarios.</p>"; return; }
    let html = ""; resultados.forEach(user => { html += generarHtmlUsuario(user); });
    contenedor.innerHTML = html;
}

async function darLike(postId, ownerUid) {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    const postData = postSnap.data();
    
    if (postData.likes && postData.likes.includes(currentUser.uid)) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        if (ownerUid !== currentUser.uid) {
            await addDoc(collection(db, "notifications"), { toUid: ownerUid, fromUsername: datosMiPerfilGlobal.username, type: 'like', timestamp: serverTimestamp() });
        }
    }
}

async function comentarPost(postId) {
    const txt = prompt("Escribe tu respuesta:");
    if (txt && txt.trim() !== "") { await updateDoc(doc(db, "posts", postId), { comments: arrayUnion({ username: datosMiPerfilGlobal.username, text: txt.trim() }) }); }
}

async function editarPerfil() {
    const nuevaBio = prompt("Escribe tu nueva biografía (Máximo 100 caracteres):");
    if (nuevaBio !== null) { await updateDoc(doc(db, "users", currentUser.uid), { bio: nuevaBio.substring(0, 100) }); }
}

// INTERRUPTOR DINÁMICO SEGUIR / DEJAR DE SEGUIR
async function toggleSeguirUsuario(uidParaSeguir) {
    if(!currentUser || !datosMiPerfilGlobal) return;
    const miRef = doc(db, "users", currentUser.uid);
    const otroRef = doc(db, "users", uidParaSeguir);
    const yaLoSigo = datosMiPerfilGlobal.following?.includes(uidParaSeguir);

    try {
        if (yaLoSigo) {
            await updateDoc(miRef, { following: arrayRemove(uidParaSeguir) });
            await updateDoc(otroRef, { followersCount: increment(-1) });
        } else {
            await updateDoc(miRef, { following: arrayUnion(uidParaSeguir) });
            await updateDoc(otroRef, { followersCount: increment(1) });
            await addDoc(collection(db, "notifications"), { toUid: uidParaSeguir, fromUsername: datosMiPerfilGlobal.username, type: 'follow', timestamp: serverTimestamp() });
        }
    } catch (e) { console.error("Error al mutar seguimiento:", e); }
}

// ==========================================
// MOTOR DE ARRANQUE Y TIEMPO REAL
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) { currentUser = user; mostrarMuro(); activarLecturaTiempoReal(); } else { currentUser = null; mostrarLogin(); }
});

async function registrarUsuario(email, password, username) {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, username: username.replace(/\s+/g, '').toLowerCase(), followersCount: 0, following: [], bio: "¡Hola! Acabo de unirme a plus." });
        alert("¡Cuenta creada!");
    } catch (e) { alert("Error: " + e.message); }
}

async function iniciarSesion(e, p) { try { await signInWithEmailAndPassword(auth, e, p); } catch (e) { alert("Credenciales incorrectas."); } }
async function cerrarSesion() { await signOut(auth); }

function activarLecturaTiempoReal() {
    desubscribirPosts = onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), (snapshot) => {
        cacheTodosLosPosts = []; 
        snapshot.forEach(doc => cacheTodosLosPosts.push({ id: doc.id, ...doc.data() })); 
        dibujarPosts(cacheTodosLosPosts);
        if(perfilAjenoUidActivo) actualizarVistaPerfilAjeno(); 
    });

    desubscribirUsuarios = onSnapshot(collection(db, "users"), async (snapshot) => {
        usuariosGlobales = []; snapshot.forEach(doc => usuariosGlobales.push(doc.data()));
        
        const miDocRef = doc(db, "users", currentUser.uid);
        const miDoc = await getDoc(miDocRef);
        
        if (miDoc.exists()) {
            datosMiPerfilGlobal = miDoc.data();
        } else {
            let nombreFallback = currentUser.email ? currentUser.email.split('@')[0] : "usuario" + Math.floor(Math.random() * 1000);
            datosMiPerfilGlobal = { 
                uid: currentUser.uid, 
                username: nombreFallback, 
                followersCount: 0, 
                following: [], 
                bio: "¡Hola! Acabo de unirme a plus." 
            };
            await setDoc(miDocRef, datosMiPerfilGlobal);
        }

        dibujarUsuarios(); dibujarMiPerfil(); buscarUsuarios(); 
        if(perfilAjenoUidActivo) actualizarVistaPerfilAjeno();
    });

    desubscribirNotif = onSnapshot(query(collection(db, "notifications"), where("toUid", "==", currentUser.uid)), (snapshot) => {
        const notifs = []; snapshot.forEach(doc => notifs.push(doc.data())); dibujarNotificaciones(notifs);
    });

    desubscribirStories = onSnapshot(query(collection(db, "stories"), orderBy("timestamp", "desc")), (snapshot) => {
        const stories = []; snapshot.forEach(doc => stories.push(doc.data())); dibujarHistoriasBarra(stories);
    });
}

async function crearPublicacion(texto) {
    if (!datosMiPerfilGlobal) {
        alert("Cargando tu perfil, por favor espera un segundo e intenta de nuevo...");
        return;
    }
    
    try { 
        await addDoc(collection(db, "posts"), { 
            text: texto, 
            uid: currentUser.uid, 
            username: datosMiPerfilGlobal.username, 
            likes: [], 
            comments: [], 
            timestamp: serverTimestamp() 
        }); 
        navegarA('inicio'); 
    } catch (e) { console.error("Error:", e); }
}

window.registrarUsuario = registrarUsuario; window.iniciarSesion = iniciarSesion; window.cerrarSesion = cerrarSesion;
window.crearPublicacion = crearPublicacion; window.toggleSeguirUsuario = toggleSeguirUsuario; window.navegarA = navegarA;
window.buscarUsuarios = buscarUsuarios; window.darLike = darLike; window.comentarPost = comentarPost; window.editarPerfil = editarPerfil;
window.abrirChatCon = abrirChatCon; window.cerrarChatActivo = cerrarChatActivo; window.enviarMensajePrivado = enviarMensajePrivado;
window.crearNuevaHistoria = crearNuevaHistoria; window.reproducirHistoria = reproducirHistoria; window.terminarVisorHistoria = terminarVisorHistoria;
window.verPerfilUsuario = verPerfilUsuario;