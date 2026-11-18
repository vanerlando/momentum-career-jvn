// Supabase cloud sync. Browser storage remains the offline/local fallback.
const SUPABASE_URL='https://bjxumtdpgvsjrphvrwwq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_Zwa82wJlvSvcJfcKVolwwA_hByJByFy';
const CLOUD_META_KEY='momentum-cloud-meta-v1';
const CLOUD_RECORD={record_type:'settings',record_id:'app-state-v1'};
const cloud=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let cloudSession=null,cloudBusy=false,cloudTimer=null,applyingCloud=false,pendingRemote=null;
const localSave=save;

document.body.insertAdjacentHTML('beforeend',`<dialog id="cloudDialog"><div class="cloud-panel"><div class="section-head"><div><span class="eyebrow">MOMENTUM CLOUD</span><h2 id="cloudTitle">Penyimpanan lintas perangkat</h2></div><button class="delete" id="closeCloud" aria-label="Tutup">×</button></div><div id="cloudBody"></div></div></dialog>`);
const cloudButton=document.createElement('button');
cloudButton.className='ghost cloud-button';
cloudButton.id='cloudButton';
cloudButton.textContent='☁ Masuk Google';
document.querySelector('.datebar').prepend(cloudButton);
document.querySelector('footer span').textContent='Data lokal + Supabase setelah login.';

function cloudMeta(){try{return JSON.parse(localStorage.getItem(CLOUD_META_KEY))||{}}catch{return {}}}
function setCloudMeta(value){localStorage.setItem(CLOUD_META_KEY,JSON.stringify({...cloudMeta(),...value}))}
function hasLocalData(){const days=Object.values(state.days||{});return days.some(d=>(d.tasks||[]).length||(d.logs||[]).length||d.journal||d.win||d.block||d.next||d.minutes)||Object.keys(state.weeks||{}).length||Object.keys(state.plan||{}).some(k=>state.plan[k])||(state.finance?.entries||[]).length||(state.customTargets||[]).length}
function setCloudStatus(text,busy=false){cloudBusy=busy;const el=$('#saveStatus');if(el)el.textContent=text;cloudButton.disabled=busy}
function accountLabel(){return cloudSession?.user?.email||'akun Google'}
function renderCloudDialog(message=''){
  const body=$('#cloudBody');
  if(!cloudSession){body.innerHTML=`<p class="muted">Masuk agar catatan Momentum dapat dibuka di perangkat lain. Google Sheets belum menjadi sumber data utama; Supabase tetap database aplikasinya.</p>${message?`<div class="notice">${esc(message)}</div>`:''}<button class="primary cloud-wide" id="googleLogin">Masuk dengan Google</button><p class="cloud-note">Kunci publik di aplikasi aman digunakan bersama RLS. Jangan pernah menaruh service-role key di repository.</p>`;$('#googleLogin').onclick=loginGoogle}
  else if(pendingRemote){body.innerHTML=`<p>Ada data di browser ini dan data lain di cloud untuk <b>${esc(accountLabel())}</b>.</p><div class="cloud-choice"><button class="primary" id="useCloud">Gunakan data cloud</button><button class="ghost" id="useLocal">Unggah data browser</button></div><p class="cloud-note">Pilih data yang paling lengkap. Sebelum menimpa, gunakan Ekspor data bila kamu ingin menyimpan salinan JSON.</p>`;$('#useCloud').onclick=()=>applyRemote(pendingRemote);$('#useLocal').onclick=async()=>{if(confirm('Ganti data cloud dengan data dari browser ini?'))await uploadState(true)}}
  else{body.innerHTML=`<div class="notice">Terhubung sebagai <b>${esc(accountLabel())}</b>.</div><div class="cloud-actions"><button class="primary" id="syncNow">Sinkronkan sekarang</button><button class="ghost" id="logoutCloud">Keluar</button></div><p class="cloud-note">Perubahan disimpan di browser terlebih dahulu, lalu disinkronkan ke Supabase. Ekspor JSON tetap disarankan sebagai cadangan darurat.</p>${message?`<p class="muted">${esc(message)}</p>`:''}`;$('#syncNow').onclick=()=>uploadState(true);$('#logoutCloud').onclick=()=>cloud.auth.signOut()}
}
async function loginGoogle(){setCloudStatus('◌ Membuka login Google…',true);const redirectTo=location.origin+location.pathname;const {error}=await cloud.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error){setCloudStatus('⚠ Login belum berhasil');renderCloudDialog(error.message)}}
async function fetchRemote(){
  if(!cloudSession)return;
  setCloudStatus('◌ Memeriksa cloud…',true);
  const {data,error}=await cloud.from('momentum_records').select('data,updated_at,revision').eq('record_type',CLOUD_RECORD.record_type).eq('record_id',CLOUD_RECORD.record_id).maybeSingle();
  if(error){setCloudStatus('⚠ Cloud gagal dibaca');renderCloudDialog(error.message);return}
  if(!data){setCloudStatus('◌ Menyiapkan cloud…');await uploadState(true);return}
  const meta=cloudMeta();
  if(meta.userId===cloudSession.user.id)applyRemote(data);else if(hasLocalData()){pendingRemote=data;setCloudStatus('⚠ Pilih sumber data');renderCloudDialog();$('#cloudDialog').showModal()}else applyRemote(data)
}
function applyRemote(record){
  if(!record?.data?.days||!record.data.weeks||!record.data.plan){toast('Data cloud tidak valid dan tidak diterapkan.');return}
  applyingCloud=true;state=record.data;localSave();applyingCloud=false;pendingRemote=null;
  setCloudMeta({userId:cloudSession.user.id,updatedAt:record.updated_at||new Date().toISOString()});
  setCloudStatus('● Tersimpan di Supabase');renderCloudDialog('Data cloud sudah dimuat.');if($('#cloudDialog').open)$('#cloudDialog').close();render();toast('Data cloud berhasil dimuat')
}
async function uploadState(manual=false){
  if(!cloudSession||cloudBusy||applyingCloud)return;
  clearTimeout(cloudTimer);setCloudStatus('◌ Menyinkronkan…',true);
  const payload={...CLOUD_RECORD,user_id:cloudSession.user.id,data:JSON.parse(JSON.stringify(state))};
  const {data,error}=await cloud.from('momentum_records').upsert(payload,{onConflict:'user_id,record_type,record_id'}).select('updated_at').single();
  if(error){setCloudStatus('⚠ Gagal sinkron — data lokal aman');if(manual){renderCloudDialog(error.message);if(!$('#cloudDialog').open)$('#cloudDialog').showModal()}return}
  setCloudMeta({userId:cloudSession.user.id,updatedAt:data.updated_at});pendingRemote=null;setCloudStatus('● Tersimpan di Supabase');if(manual)toast('Sinkronisasi selesai')
}
function scheduleCloudSave(){if(!cloudSession||applyingCloud)return;clearTimeout(cloudTimer);setCloudStatus('◌ Menunggu sinkronisasi…');cloudTimer=setTimeout(()=>uploadState(false),900)}
save=function(){localSave();if(cloudSession)scheduleCloudSave()};
cloudButton.onclick=()=>{renderCloudDialog();$('#cloudDialog').showModal()};
$('#closeCloud').onclick=()=>$('#cloudDialog').close();
$('#cloudDialog').addEventListener('click',e=>{if(e.target===$('#cloudDialog'))$('#cloudDialog').close()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&cloudSession)uploadState(false)});
cloud.auth.onAuthStateChange((event,session)=>{const changedUser=session?.user?.id!==cloudSession?.user?.id;cloudSession=session;cloudButton.textContent=session?'☁ '+(session.user.email?.split('@')[0]||'Terhubung'):'☁ Masuk Google';cloudButton.disabled=false;if(!session){setCloudStatus('● Tersimpan di browser ini');pendingRemote=null}else if(changedUser||event==='SIGNED_IN')setTimeout(fetchRemote,0)});
