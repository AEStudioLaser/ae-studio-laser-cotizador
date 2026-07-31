import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {
  Archive, BarChart3, Bell, Box, Calculator, Check, ClipboardList, Cloud, CloudOff,
  FileText, Flame, LogIn, LogOut, Menu, MessageCircle, Package, Plus, Printer,
  RefreshCw, RotateCcw, Save, Search, Scissors, Settings, Trash2, UserRound,
  Users, Wifi, X, Palette, PencilRuler
} from 'lucide-react'
import './styles.css'
import './service.css'
import {blankCatalogProduct, defaultCatalog} from './catalogData'
import {cloud, isCloudConfigured} from './cloud'
import Design3DPage from './design3d/Design3DPage'
import CreativeProjectsPage from './creative/CreativeProjectsPage'
import {calculateCricutConsumption, calculateServicePrice, calculateSheetMaterialCost, remainingAreaLength, resolveServiceFinalPrice} from './pricing/serviceQuote'
import {calculateFilamentBreakdown, resolvePrintPrice} from './pricing/print3d'
import OrderPayments from './orders/OrderPayments'
import {isPaymentOverdue, paymentSummary} from './orders/payments'
import {createProductionParameters, defaultProfileForJob, productionProfiles} from './productionPresets'

const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v)||0)
const num=v=>Number(v)||0
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`
const today=()=>{
  const date=new Date()
  date.setMinutes(date.getMinutes()-date.getTimezoneOffset())
  return date.toISOString().slice(0,10)
}
const defaults={businessName:'A&E Studio Laser',phone:'',printer:'Bambu Lab A1',electricityPrice:1.2,printerWatts:90,wearPerHour:5,failureRate:10,laserRate:80,cricutRate:40,defaultProfit:50,roundTo:5,quoteValidity:15,
  materials:[{id:'pla',name:'PLA',priceKg:298},{id:'petg',name:'PETG',priceKg:340}],
  laserMaterials:[{id:'mdf3',name:'MDF 3 mm',pricingMode:'sheet',sheetWidth:120,sheetHeight:240,sheetCost:160,waste:0},{id:'acrylic3',name:'Acrílico 3 mm',pricingMode:'sheet',sheetWidth:60,sheetHeight:40,sheetCost:240,waste:10},{id:'tumbler',name:'Termo para grabado',pricingMode:'unit',sheetWidth:0,sheetHeight:0,sheetCost:0,waste:0},{id:'steelplate',name:'Placa inoxidable',pricingMode:'unit',sheetWidth:0,sheetHeight:0,sheetCost:0,waste:0}],
  cricutMaterials:[{id:'vinyl',name:'Vinil adhesivo',pricingMode:'meter',sheetWidth:60,sheetHeight:100,sheetCost:65,waste:5},{id:'sticker',name:'Papel sticker A4',pricingMode:'sheet',sheetWidth:21,sheetHeight:29.7,sheetCost:12,waste:8},{id:'cardstock',name:'Cartulina 12 × 12',pricingMode:'sheet',sheetWidth:30.5,sheetHeight:30.5,sheetCost:15,waste:8}]}
const freshQuote=s=>({client:'',project:'',comments:'',catalogProduct:'',material:s.materials[0]?.id||'pla',quantity:1,weight:50,hours:4,minutes:0,extras:0,labor:0,failure:num(s.failureRate??10),profit:num(s.defaultProfit)||50,multicolor:false,extraColors:[],priceMode:'auto',manualTotal:'',productionParams:createProductionParameters('3d','general')})
const freshStock={type:'product',name:'',category:'laser',supplier:'',purchaseQty:1,purchaseTotal:0,stock:1,minStock:0,salePrice:0,purchaseDate:today(),trackingMode:'units',materialWidth:60,materialLength:100,areaRemaining:0}
const freshClient={name:'',phone:'',email:'',notes:''}
const unitCost=i=>num(i.purchaseTotal)/Math.max(1,num(i.purchaseQty))
const categoryName=id=>({laser:'Láser','3d':'Impresión 3D',cricut:'Cricut'}[id]||'Sin categoría')

function useLocal(key,initial,legacy){
  const [value,setValue]=useState(()=>{try{const v=localStorage.getItem(key);if(v)return JSON.parse(v);if(legacy){const old=localStorage.getItem(legacy);if(old)return JSON.parse(old)}}catch{}return typeof initial==='function'?initial():initial})
  useEffect(()=>localStorage.setItem(key,JSON.stringify(value)),[key,value])
  return [value,setValue]
}

function App(){
  const [page,setPage]=useState(()=>new URLSearchParams(location.search).get('open')==='orders'?'orders':'dashboard'),[open,setOpen]=useState(false)
  const [settings,setSettings]=useLocal('ae_settings_v10',()=>{try{const old=JSON.parse(localStorage.getItem('ae_settings_v7')||localStorage.getItem('ae_settings_v5')||localStorage.getItem('ae_stage1_settings')||'{}'),laser=old.laserMaterials||defaults.laserMaterials,extra=defaults.laserMaterials.filter(d=>!laser.some(m=>m.id===d.id));return{...defaults,...old,laserMaterials:[...laser,...extra],cricutMaterials:old.cricutMaterials||defaults.cricutMaterials}}catch{return defaults}})
  const [quotes,setQuotes]=useLocal('ae_quotes_v5',[],'ae_stage1_history')
  const [orders,setOrders]=useLocal('ae_orders_v5',[])
  const [inventory,setInventory]=useLocal('ae_inventory_v5',[])
  const [catalog,setCatalog]=useLocal('ae_catalog_v1',defaultCatalog)
  const [clients,setClients]=useLocal('ae_clients_v5',[])
  const [models,setModels]=useLocal('ae_models_v5',[])
  const [creativeProjects,setCreativeProjects]=useLocal('ae_creative_projects_v1',[])
  const [quoteDraft,setQuoteDraft]=useState(null)
  const [notificationsEnabled,setNotificationsEnabled]=useLocal('ae_notifications_enabled_v1',false)
  const [unreadOrders,setUnreadOrders]=useState(0)
  const [session,setSession]=useState(null),[cloudReady,setCloudReady]=useState(false)
  const [syncStatus,setSyncStatus]=useState(isCloudConfigured?'signed-out':'local'),[lastSynced,setLastSynced]=useState('')
  const skipUpload=useRef(false),stateRef=useRef(null)
  const deviceId=useMemo(()=>{let id=localStorage.getItem('ae_device_id');if(!id){id=uid();localStorage.setItem('ae_device_id',id)}return id},[])
  const cloudState=useMemo(()=>({version:2,settings,quotes,orders,inventory,catalog,clients,models,creativeProjects}),[settings,quotes,orders,inventory,catalog,clients,models,creativeProjects])
  stateRef.current=cloudState

  const applyCloudState=useCallback(payload=>{
    if(!payload||typeof payload!=='object')return
    skipUpload.current=true
    if(payload.settings)setSettings({...defaults,...payload.settings})
    if(Array.isArray(payload.quotes))setQuotes(payload.quotes)
    if(Array.isArray(payload.orders))setOrders(payload.orders)
    if(Array.isArray(payload.inventory))setInventory(payload.inventory)
    if(Array.isArray(payload.catalog))setCatalog(payload.catalog)
    if(Array.isArray(payload.clients))setClients(payload.clients)
    if(Array.isArray(payload.models))setModels(payload.models)
    if(Array.isArray(payload.creativeProjects))setCreativeProjects(payload.creativeProjects)
  },[setSettings,setQuotes,setOrders,setInventory,setCatalog,setClients,setModels,setCreativeProjects])

  const pushCloud=useCallback(async()=>{
    if(!cloud||!session?.user)return
    setSyncStatus(navigator.onLine?'syncing':'offline')
    if(!navigator.onLine)return
    const {error}=await cloud.from('business_state').upsert({
      user_id:session.user.id,payload:stateRef.current,device_id:deviceId,updated_at:new Date().toISOString()
    },{onConflict:'user_id'})
    if(error){setSyncStatus('error');throw error}
    setSyncStatus('synced');setLastSynced(new Date().toISOString())
  },[session?.user?.id,deviceId])

  const clearOrderNotifications=useCallback(()=>{
    setUnreadOrders(0)
    navigator.clearAppBadge?.().catch?.(()=>{})
  },[])

  const enableNotifications=useCallback(async()=>{
    if(!('Notification'in window))return alert('Este dispositivo no admite notificaciones de la aplicación.')
    const permission=await Notification.requestPermission()
    const enabled=permission==='granted'
    setNotificationsEnabled(enabled)
    if(!enabled)return alert('No se activaron las notificaciones. Puedes permitirlas desde la configuración del dispositivo.')
    clearOrderNotifications()
    alert('Notificaciones de pedidos activadas en este dispositivo.')
  },[setNotificationsEnabled,clearOrderNotifications])

  const announceOrders=useCallback(async(newOrders)=>{
    if(!newOrders?.length)return
    setUnreadOrders(current=>{
      const next=current+newOrders.length
      navigator.setAppBadge?.(next).catch?.(()=>{})
      return next
    })
    if(!notificationsEnabled||!('Notification'in window)||Notification.permission!=='granted')return
    const latest=newOrders[0],title=newOrders.length===1?'Nuevo pedido':`${newOrders.length} pedidos nuevos`
    const options={body:`${latest.project||'Pedido'} · ${latest.client||'Sin cliente'} · ${money(latest.total)}`,icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:`order-${latest.id}`,data:{url:'/?open=orders'}}
    try{
      const registration='serviceWorker'in navigator?await navigator.serviceWorker.ready:null
      if(registration?.showNotification)await registration.showNotification(title,options)
      else new Notification(title,options)
    }catch{}
  },[notificationsEnabled])

  const pullCloud=useCallback(async()=>{
    if(!cloud||!session?.user)return
    setSyncStatus(navigator.onLine?'syncing':'offline')
    if(!navigator.onLine)return
    const {data,error}=await cloud.from('business_state').select('payload,updated_at').eq('user_id',session.user.id).maybeSingle()
    if(error){setSyncStatus('error');throw error}
    if(data?.payload)applyCloudState(data.payload)
    else await pushCloud()
    setCloudReady(true);setSyncStatus('synced');setLastSynced(data?.updated_at||new Date().toISOString())
  },[session?.user?.id,applyCloudState,pushCloud])

  useEffect(()=>{
    if(!cloud)return
    cloud.auth.getSession().then(({data})=>setSession(data.session||null))
    const {data}=cloud.auth.onAuthStateChange((_event,next)=>setSession(next))
    return()=>data.subscription.unsubscribe()
  },[])
  useEffect(()=>{if(!session?.user){setCloudReady(false);setSyncStatus(isCloudConfigured?'signed-out':'local');return}pullCloud().catch(()=>{})},[session?.user?.id])
  useEffect(()=>{
    if(!cloudReady||!session?.user)return
    if(skipUpload.current){skipUpload.current=false;return}
    setSyncStatus(navigator.onLine?'pending':'offline')
    const timer=setTimeout(()=>pushCloud().catch(()=>{}),900)
    return()=>clearTimeout(timer)
  },[cloudState,cloudReady,session?.user?.id,pushCloud])
  useEffect(()=>{
    if(!cloudReady||!session?.user||!cloud)return
    const channel=cloud.channel(`business-state-${session.user.id}`).on('postgres_changes',{
      event:'UPDATE',schema:'public',table:'business_state',filter:`user_id=eq.${session.user.id}`
    },event=>{
      if(event.new?.device_id===deviceId)return
      const incoming=Array.isArray(event.new?.payload?.orders)?event.new.payload.orders:[],known=new Set((stateRef.current?.orders||[]).map(order=>order.id))
      announceOrders(incoming.filter(order=>!known.has(order.id)))
      applyCloudState(event.new?.payload);setSyncStatus('synced');setLastSynced(event.new?.updated_at||new Date().toISOString())
    }).subscribe()
    return()=>{cloud.removeChannel(channel)}
  },[cloudReady,session?.user?.id,deviceId,applyCloudState,announceOrders])
  useEffect(()=>{
    const online=()=>{if(session?.user)pullCloud().catch(()=>{})}
    const offline=()=>setSyncStatus('offline')
    addEventListener('online',online);addEventListener('offline',offline)
    return()=>{removeEventListener('online',online);removeEventListener('offline',offline)}
  },[session?.user?.id,pullCloud])
  useEffect(()=>{'serviceWorker'in navigator&&navigator.serviceWorker.register('/sw.js').catch(()=>{})},[])
  const nav=[['dashboard','Resumen',BarChart3],['quote','Impresión 3D',Calculator],['design3d','Diseño 3D',PencilRuler],['laser','Láser',Flame],['cricut','Cricut',Scissors],['creative','Diseño creativo',Palette],['catalog','Catálogo',Archive],['orders','Pedidos',ClipboardList],['inventory','Inventario',Package],['clients','Clientes',Users],['quotes','Cotizaciones',FileText],['models','Modelos 3D',Box],['cloud','Sincronización',Cloud],['settings','Configuración',Settings]]
  const go=id=>{setPage(id);setOpen(false)}
  const signIn=async(email,password)=>{const {error}=await cloud.auth.signInWithPassword({email,password});if(error)throw error}
  const signUp=async(email,password)=>{const {data,error}=await cloud.auth.signUp({email,password});if(error)throw error;return data}
  const signOut=async()=>{await cloud.auth.signOut();setSession(null);setCloudReady(false)}
  const syncLabels={local:'Solo en este dispositivo','signed-out':'Nube disponible · inicia sesión',pending:'Cambios por guardar',syncing:'Sincronizando…',synced:'Sincronizado',offline:'Sin Internet · copia local',error:'Revisar sincronización'}
  return <div className="appShell">
    <aside className={`sidebar ${open?'open':''}`}><div className="brand"><img src="/logo-ae.png" alt="A&E Studio Laser"/><div><strong>A&E Studio Maker</strong><span>A&E Studio Laser</span></div></div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}><Icon size={19}/>{label}</button>)}</nav><button className={`sidebarSync ${syncStatus}`} onClick={()=>go('cloud')}>{syncStatus==='offline'||syncStatus==='error'||syncStatus==='local'?<CloudOff size={16}/>:<Cloud size={16}/>}<span>{syncLabels[syncStatus]}</span></button></aside>
    {open&&<button className="scrim" onClick={()=>setOpen(false)} aria-label="Cerrar menú"/>}
    <main className="main"><header className="topbar"><button className="menuButton" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><div className="topbarTitle"><h1>{nav.find(n=>n[0]===page)?.[1]}</h1><p>A&E Studio Laser</p></div><button className={`notificationButton ${notificationsEnabled?'enabled':''}`} aria-label={notificationsEnabled?'Ver pedidos nuevos':'Activar notificaciones'} title={notificationsEnabled?'Ver pedidos nuevos':'Activar notificaciones'} onClick={()=>notificationsEnabled?(clearOrderNotifications(),go('orders')):enableNotifications()}><Bell size={20}/>{unreadOrders>0&&<span>{unreadOrders>99?'99+':unreadOrders}</span>}</button></header>
      <div className="content">
        {page==='dashboard'&&<Dashboard orders={orders} inventory={inventory} quotes={quotes} go={go} notificationsEnabled={notificationsEnabled} onEnableNotifications={enableNotifications}/>}
        {page==='quote'&&<Quote settings={settings} inventory={inventory} setInventory={setInventory} catalog={catalog} quotes={quotes} setQuotes={setQuotes} orders={orders} setOrders={setOrders} clients={clients} setClients={setClients} models={models} setModels={setModels} designDraft={quoteDraft} onDraftConsumed={()=>setQuoteDraft(null)} onOrderCreated={order=>announceOrders([order])}/>}
        {page==='design3d'&&<Design3DPage onQuote={draft=>{setQuoteDraft(draft);go('quote')}}/>}
        {page==='laser'&&<ServiceQuote service="laser" inventory={inventory} setInventory={setInventory} catalog={catalog} settings={settings} quotes={quotes} setQuotes={setQuotes} orders={orders} setOrders={setOrders} clients={clients} setClients={setClients} onOrderCreated={order=>announceOrders([order])}/>}
        {page==='cricut'&&<ServiceQuote service="cricut" inventory={inventory} setInventory={setInventory} catalog={catalog} settings={settings} quotes={quotes} setQuotes={setQuotes} orders={orders} setOrders={setOrders} clients={clients} setClients={setClients} onOrderCreated={order=>announceOrders([order])}/>}
        {page==='creative'&&<CreativeProjectsPage projects={creativeProjects} setProjects={setCreativeProjects} clients={clients} inventory={inventory} orders={orders} products={catalog}/>}
        {page==='catalog'&&<Catalog products={catalog} setProducts={setCatalog}/>}
        {page==='orders'&&<Orders orders={orders} setOrders={setOrders}/>}
        {page==='inventory'&&<Inventory items={inventory} setItems={setInventory}/>}
        {page==='clients'&&<Clients clients={clients} setClients={setClients}/>}
        {page==='quotes'&&<Quotes quotes={quotes} setQuotes={setQuotes}/>}
        {page==='models'&&<Models models={models} setModels={setModels} settings={settings}/>}
        {page==='cloud'&&<CloudPage configured={isCloudConfigured} session={session} status={syncStatus} lastSynced={lastSynced} onSignIn={signIn} onSignUp={signUp} onSignOut={signOut} onSync={()=>pullCloud().catch(()=>{})}/>}
        {page==='settings'&&<SettingsPage settings={settings} setSettings={setSettings}/>}
      </div></main>
  </div>
}

function CloudPage({configured,session,status,lastSynced,onSignIn,onSignUp,onSignOut,onSync}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[mode,setMode]=useState('signin')
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const submit=async e=>{
    e.preventDefault();setBusy(true);setMessage('')
    try{
      if(mode==='signin'){await onSignIn(email,password);setMessage('Sesión iniciada. Estamos descargando tus datos.')}
      else{const result=await onSignUp(email,password);setMessage(result.session?'Cuenta creada y conectada.':'Cuenta creada. Revisa tu correo para confirmar el acceso.')}
    }catch(error){setMessage(error.message||'No fue posible completar el acceso.')}
    finally{setBusy(false)}
  }
  const statusText={'signed-out':'Aún no has iniciado sesión',pending:'Hay cambios esperando guardarse',syncing:'Sincronizando datos…',synced:'Todos tus datos están sincronizados',offline:'Trabajando sin Internet; se sincronizará al regresar',error:'No se pudo sincronizar. Intenta nuevamente.',local:'Conexión en la nube pendiente'}
  if(!configured)return <><section className="cloudHero"><div className="cloudHeroIcon"><Cloud size={34}/></div><div><span>Siguiente paso</span><h2>Sincronización preparada</h2><p>La aplicación ya tiene lista la conexión segura. Falta enlazar el espacio en la nube de A&E Studio Laser.</p></div></section><Card title="Qué se sincronizará" subtitle="La información quedará disponible en todos tus dispositivos."><div className="syncFeatures"><span><Check/>Cotizaciones y pedidos</span><span><Check/>Clientes y catálogo</span><span><Check/>Inventario, modelos y diseños</span><span><Check/>Materiales, costos y configuración</span></div><div className="cloudPending"><CloudOff/><div><b>Conexión pendiente</b><p>Cuando se agreguen las credenciales del espacio de A&E, aparecerá aquí el acceso con correo y contraseña.</p></div></div></Card></>
  if(!session)return <div className="cloudLayout"><section className="cloudHero"><div className="cloudHeroIcon"><Cloud size={34}/></div><div><span>Nube de A&E</span><h2>Usa la app en cualquier dispositivo</h2><p>Inicia sesión con la misma cuenta en celular, tableta o computadora.</p></div></section><Card title={mode==='signin'?'Iniciar sesión':'Crear cuenta'} subtitle="Tus datos están protegidos y separados de otros usuarios."><form className="cloudForm" onSubmit={submit}><Field label="Correo electrónico"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></Field><Field label="Contraseña"><input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'}/></Field>{message&&<div className="cloudMessage">{message}</div>}<button className="primary" disabled={busy} type="submit">{busy?<RefreshCw className="spin" size={18}/>:<LogIn size={18}/>} {busy?'Espera…':mode==='signin'?'Entrar':'Crear cuenta'}</button><button type="button" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}}>{mode==='signin'?'Crear una cuenta nueva':'Ya tengo una cuenta'}</button></form></Card></div>
  return <><section className="cloudHero connected"><div className="cloudHeroIcon"><Wifi size={34}/></div><div><span>Cuenta conectada</span><h2>{session.user.email}</h2><p>{statusText[status]||'Sincronización activa'}</p></div></section><div className="twoColumns"><Card title="Estado de la nube" subtitle={lastSynced?`Última sincronización: ${new Date(lastSynced).toLocaleString('es-MX')}`:'Preparando la primera sincronización'}><div className={`syncState ${status}`}><Cloud size={28}/><div><b>{statusText[status]}</b><p>Los cambios se guardan automáticamente. También conservamos una copia en este dispositivo.</p></div></div><div className="actions"><button className="primary" onClick={onSync} disabled={status==='syncing'}><RefreshCw className={status==='syncing'?'spin':''} size={18}/>Sincronizar ahora</button></div></Card><Card title="Dispositivos" subtitle="Cómo abrir tus datos en otro equipo."><ol className="deviceSteps"><li>Abre la misma dirección de la aplicación.</li><li>Entra a <b>Sincronización</b>.</li><li>Inicia sesión con este mismo correo y contraseña.</li></ol><button onClick={onSignOut}><LogOut size={18}/>Cerrar sesión en este dispositivo</button></Card></div></>
}

function Dashboard({orders,inventory,quotes,go,notificationsEnabled,onEnableNotifications}){
  const [choosingQuote,setChoosingQuote]=useState(false)
  const delivered=orders.filter(o=>o.status==='delivered'),sales=delivered.reduce((s,o)=>s+num(o.total),0),cost=delivered.reduce((s,o)=>s+num(o.productionCost),0)
  const pending=orders.filter(o=>!['delivered','cancelled'].includes(o.status)).length,low=inventory.filter(i=>num(i.stock)<=num(i.minStock)),investment=inventory.reduce((s,i)=>s+unitCost(i)*num(i.stock),0)
  return <><section className="hero"><div><span>Panel del negocio</span><h2>Todo tu taller en un solo lugar</h2><p>Cotiza, controla pedidos y conoce el valor de tu inventario.</p></div><button className="primary" onClick={()=>setChoosingQuote(!choosingQuote)}><Plus size={18}/>Nueva cotización</button></section>
    {choosingQuote&&<section className="quotePicker" aria-label="Selecciona el tipo de cotización"><div><b>¿Qué deseas cotizar?</b><span>Selecciona el servicio para abrir el formulario correcto.</span></div><div className="quotePickerOptions"><button onClick={()=>go('quote')}><Calculator/><b>Impresión 3D</b><span>Piezas y modelos impresos</span></button><button onClick={()=>go('laser')}><Flame/><b>Láser</b><span>Corte y grabado</span></button><button onClick={()=>go('cricut')}><Scissors/><b>Cricut</b><span>Vinil, stickers y papel</span></button></div></section>}
    {!notificationsEnabled&&<button className="notificationPrompt" onClick={onEnableNotifications}><Bell size={19}/><span><b>Activa los avisos de pedidos</b><small>Recibe una alerta cuando se cree un pedido desde otro dispositivo.</small></span></button>}
    <div className="stats"><Stat label="Ventas entregadas" value={money(sales)} tone="blue"/><Stat label="Utilidad estimada" value={money(sales-cost)} tone="green"/><Stat label="Pedidos activos" value={pending} tone="orange"/><Stat label="Inventario invertido" value={money(investment)} tone="purple"/></div>
    <div className="twoColumns"><Card title="Pedidos recientes" subtitle={`${orders.length} registrados`}>{orders.length?orders.slice(0,5).map(o=><div className="listRow" key={o.id}><div><b>{o.project||'Pedido'}</b><span>{o.client||'Sin cliente'}</span></div><div className="right"><Status value={o.status}/><b>{money(o.total)}</b></div></div>):<Empty text="Aún no hay pedidos."/>}</Card>
      <Card title="Alertas de inventario" subtitle={`${low.length} con existencia baja`}>{low.length?low.slice(0,6).map(i=><div className="listRow" key={i.id}><div><b>{i.name}</b><span>{i.category||'Sin categoría'}</span></div><span className="stockAlert">{num(i.stock)} disponibles</span></div>):<Empty text="Sin alertas de existencias."/>}</Card></div>
    <Card title="Actividad" subtitle="Información capturada"><div className="activity"><button onClick={()=>go('quotes')}><FileText/><b>{quotes.length}</b><span>Cotizaciones</span></button><button onClick={()=>go('orders')}><ClipboardList/><b>{orders.length}</b><span>Pedidos</span></button><button onClick={()=>go('inventory')}><Package/><b>{inventory.length}</b><span>Artículos</span></button></div></Card>
  </>
}

function Quote({settings,inventory,setInventory,catalog,quotes,setQuotes,orders,setOrders,clients,setClients,models,setModels,designDraft,onDraftConsumed,onOrderCreated}){
  const fromDesign=()=>designDraft?{...freshQuote(settings),project:designDraft.project,quantity:designDraft.quantity,weight:0,hours:0,minutes:0,designMeta:designDraft.designMeta}:freshQuote(settings)
  const [form,setForm]=useState(fromDesign),[saved,setSaved]=useState(false)
  useEffect(()=>{if(!designDraft)return;setForm({...freshQuote(settings),project:designDraft.project,quantity:designDraft.quantity,weight:0,hours:0,minutes:0,designMeta:designDraft.designMeta});setSaved(false);onDraftConsumed?.()},[designDraft?.id])
  const inventoryMaterials=(inventory||[]).filter(i=>i.category==='3d'&&i.type!=='product'&&num(i.stock)>0).map(i=>({id:`stock-${i.id}`,name:`${i.name} (Inventario: ${num(i.stock)}${i.trackingMode==='grams'?' g':''})`,priceKg:i.trackingMode==='grams'?unitCost(i)*1000:unitCost(i),inventoryId:i.id,trackingMode:i.trackingMode||'units'})),materialCatalog=[...(settings.materials||[]),...inventoryMaterials],catalogProducts=(catalog||[]).filter(p=>(p.service==='3d'||p.service==='all')&&p.status!=='hidden')
  const update=(k,v)=>{setSaved(false);setForm({...form,[k]:v})},material=materialCatalog.find(m=>m.id===form.material)||materialCatalog[0]||{name:'Material',priceKg:0},catalogItem=catalogProducts.find(p=>p.id===form.catalogProduct)
  const extraColors=(form.multicolor?form.extraColors:[]).map(color=>({...color,material:materialCatalog.find(m=>m.id===color.material)||materialCatalog[0]}))
  const calc=useMemo(()=>{
    const qty=Math.max(1,num(form.quantity)),h=num(form.hours)+num(form.minutes)/60,filament=calculateFilamentBreakdown({primaryMaterial:material,primaryWeight:form.weight,extraColors}),materialCost=filament.totalCost,electricity=h*num(settings.printerWatts)/1000*num(settings.electricityPrice),wear=h*num(settings.wearPerHour),repeatableCost=materialCost+electricity+wear,failureCost=repeatableCost*Math.max(0,num(form.failure))/100,productionCost=repeatableCost+failureCost+num(form.labor)+num(form.extras),raw=productionCost*(1+num(form.profit)/100),catalogBase=num(catalogItem?.price)*qty,step=Math.max(1,num(settings.roundTo)),automaticTotal=Math.ceil(Math.max(raw,catalogBase)/step)*step
    const pricing=resolvePrintPrice({productionCost,automaticTotal,quantity:qty,priceMode:form.priceMode,manualTotal:form.manualTotal})
    return{printHours:h,materialCost,electricity,wear,failureCost,productionCost,catalogBase,...pricing,filamentLines:filament.lines,totalFilamentGrams:filament.totalGrams,inventoryUsage:filament.inventoryUsage}
  },[form,material,catalogItem,settings,materialCatalog])
  const snapshot=()=>({id:uid(),folio:`COT-${Date.now().toString().slice(-7)}`,date:new Date().toISOString(),...form,materialName:material.name,catalogName:catalogItem?.name||'',...calc})
  const ensureClient=()=>{const name=form.client.trim();if(name&&!clients.some(c=>c.name.toLowerCase()===name.toLowerCase()))setClients([{id:uid(),name,phone:'',email:'',notes:''},...clients])}
  const save=()=>{const q=snapshot();setQuotes([q,...quotes]);ensureClient();setSaved(true);return q}
  const order=()=>{
    const missing=Object.entries(calc.inventoryUsage).find(([id,grams])=>num(inventory.find(i=>i.id===id)?.stock)<grams)
    if(missing){const item=inventory.find(i=>i.id===missing[0]);return alert(`No hay suficiente ${item?.name||'filamento'}. Disponible: ${num(item?.stock)} g.`)}
    const q=save()
    if(Object.keys(calc.inventoryUsage).length)setInventory(inventory.map(item=>calc.inventoryUsage[item.id]?{...item,stock:Math.max(0,num(item.stock)-calc.inventoryUsage[item.id]),updatedAt:new Date().toISOString()}:item))
    const createdOrder={...q,id:uid(),quoteId:q.id,status:'pending',createdAt:new Date().toISOString(),dueDate:'',paymentDueDate:'',payments:[]}
    setOrders([createdOrder,...orders]);onOrderCreated?.(createdOrder)
    alert(`Cotización guardada y pedido creado.${Object.keys(calc.inventoryUsage).length?' Inventario de filamento actualizado.':''}`)
  }
  const message=()=>encodeURIComponent(`*${settings.businessName||'A&E Studio Laser'}*\nCotización\nCliente: ${form.client||'—'}\nProyecto: ${form.project||catalogItem?.name||'—'}\nCantidad: ${form.quantity}${form.comments?.trim()?`\nComentarios: ${form.comments.trim()}`:''}\n*Total: ${money(calc.total)}*\nVigencia: ${settings.quoteValidity||15} días`)
  const saveModel=()=>{if(!form.project.trim())return alert('Escribe el proyecto.');setModels([{id:uid(),name:form.project.trim(),material:form.material,weight:form.weight,hours:form.hours,minutes:form.minutes},...models]);alert('Modelo guardado.')}
  const loadModel=id=>{const m=models.find(x=>x.id===id);if(m)setForm({...form,project:m.name,material:m.material,weight:m.weight,hours:m.hours,minutes:m.minutes})}
  const addColor=()=>{setSaved(false);setForm({...form,extraColors:[...form.extraColors,{id:uid(),material:materialCatalog[0]?.id||'',weight:0}]})}
  const updateColor=(id,key,value)=>{setSaved(false);setForm({...form,extraColors:form.extraColors.map(color=>color.id===id?{...color,[key]:value}:color)})}
  const removeColor=id=>{setSaved(false);setForm({...form,extraColors:form.extraColors.filter(color=>color.id!==id)})}
  return <div className="quoteLayout"><Card title="Nueva cotización" subtitle="Captura solo los datos necesarios.">
    {form.designMeta&&<div className="usageNote designTransferNote"><b>Datos recibidos de Diseño 3D</b><span>{form.designMeta.type}: {form.designMeta.length} × {form.designMeta.height} × {form.designMeta.thickness} {form.designMeta.unit}. Captura el peso y el tiempo reales desde Bambu Studio antes de guardar la cotización.</span></div>}
    {models.length>0&&<Field label="Cargar modelo guardado" full><select defaultValue="" onChange={e=>{loadModel(e.target.value);e.target.value=''}}><option value="">Seleccionar modelo…</option>{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>}
    {catalogProducts.length>0&&<Field label="Producto del catálogo (opcional)" full><select value={form.catalogProduct} onChange={e=>{const item=catalogProducts.find(p=>p.id===e.target.value);setForm({...form,catalogProduct:e.target.value,project:form.project||item?.name||''});setSaved(false)}}><option value="">Cotización desde cero</option>{catalogProducts.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</select></Field>}
    <div className="formGrid"><Field label="Cliente"><input value={form.client} onChange={e=>update('client',e.target.value)} placeholder="Nombre del cliente"/></Field><Field label="Proyecto"><input value={form.project} onChange={e=>update('project',e.target.value)} placeholder="Ej. Llavero personalizado"/></Field><Field label="Detalles o comentarios" full><textarea rows="3" value={form.comments||''} onChange={e=>update('comments',e.target.value)} placeholder="Ej. 5 llaveros azules, 3 rojos y 2 blancos"/></Field>
      <Field label="Material"><select value={form.material} onChange={e=>update('material',e.target.value)}><optgroup label="Materiales configurados">{(settings.materials||[]).map(m=><option key={m.id} value={m.id}>{m.name} — {money(m.priceKg)}/kg</option>)}</optgroup>{inventoryMaterials.length>0&&<optgroup label="Inventario de Impresión 3D">{inventoryMaterials.map(m=><option key={m.id} value={m.id}>{m.name} — {money(m.priceKg)}/kg</option>)}</optgroup>}</select></Field><Field label="Cantidad"><input type="number" min="1" value={form.quantity} onChange={e=>update('quantity',e.target.value)}/></Field>
      <Field label={form.multicolor?'Peso del color principal (g)':'Peso total (g)'}><input type="number" min="0" value={form.weight} onChange={e=>update('weight',e.target.value)}/></Field><div className="splitFields"><Field label="Horas"><input type="number" min="0" value={form.hours} onChange={e=>update('hours',e.target.value)}/></Field><Field label="Minutos"><input type="number" min="0" max="59" value={form.minutes} onChange={e=>update('minutes',e.target.value)}/></Field></div>
      <Field label="Extras ($)"><input type="number" min="0" value={form.extras} onChange={e=>update('extras',e.target.value)}/></Field><Field label="Mano de obra ($)"><input type="number" min="0" value={form.labor} onChange={e=>update('labor',e.target.value)}/></Field><Field label="Riesgo de falla (%)"><input type="number" min="0" max="100" step="1" value={form.failure} onChange={e=>update('failure',e.target.value)}/></Field><Field label={`Ganancia: ${form.profit}%`}><input type="range" min="0" max="150" value={form.profit} onChange={e=>update('profit',e.target.value)}/></Field></div>
    <div className="priceModeBox"><div><b>Precio final</b><span>Usa el cálculo automático o define una promoción.</span></div><div className="priceModeOptions"><button className={form.priceMode!=='manual'?'active':''} onClick={()=>update('priceMode','auto')}>Automático</button><button className={form.priceMode==='manual'?'active':''} onClick={()=>update('priceMode','manual')}>Manual / promoción</button></div>{form.priceMode==='manual'&&<Field label="Total a cobrar ($)"><input type="number" min="0" step=".01" value={form.manualTotal} onChange={e=>update('manualTotal',e.target.value)} placeholder={String(calc.automaticTotal)}/></Field>}<div className={`priceHealth ${calc.belowCost?'warning':'healthy'}`}><span>Sugerencia automática: <b>{money(calc.automaticTotal)}</b></span>{calc.isManual&&<span>Utilidad real: <b>{money(calc.profitAmount)}</b> · Margen: <b>{calc.marginPercent.toFixed(1)}%</b></span>}{calc.belowCost&&<strong>El precio manual está por debajo del costo de producción.</strong>}</div></div>
    <ProductionParameters service="3d" value={form.productionParams} onChange={value=>update('productionParams',value)}/>
    <label className="checkField multicolorToggle"><input type="checkbox" checked={form.multicolor} onChange={e=>update('multicolor',e.target.checked)}/><span>Impresión multicolor</span></label>
    {form.multicolor&&<div className="multicolorBox"><div className="multicolorHeader"><div><b>Filamentos adicionales</b><small>Captura los gramos totales que reporta Bambu Studio, incluida la purga o torre.</small></div><button onClick={addColor}><Plus size={17}/>Agregar color</button></div>{form.extraColors.length?form.extraColors.map(color=><div className="multicolorRow" key={color.id}><select aria-label="Material o color adicional" value={color.material} onChange={e=>updateColor(color.id,'material',e.target.value)}>{materialCatalog.map(m=><option key={m.id} value={m.id}>{m.name} — {money(m.priceKg)}/kg</option>)}</select><label><span>Peso (g)</span><input aria-label="Peso del color adicional (g)" type="number" min="0" step=".1" value={color.weight} onChange={e=>updateColor(color.id,'weight',e.target.value)}/></label><button className="iconButton danger" aria-label="Eliminar color" onClick={()=>removeColor(color.id)}><Trash2 size={16}/></button></div>):<p className="multicolorEmpty">Agrega otro color para incluirlo en el costo y en el consumo de filamento.</p>}<div className="multicolorTotal"><span>Filamento total</span><b>{calc.totalFilamentGrams.toFixed(1)} g</b></div></div>}
    {saved&&<div className="success"><Check size={17}/>Cotización guardada</div>}<div className="actions"><button className="primary" onClick={save}><Save size={18}/>Guardar</button><button onClick={order}><ClipboardList size={18}/>Crear pedido</button><button onClick={()=>window.location.href=`https://wa.me/?text=${message()}`}><MessageCircle size={18}/>WhatsApp</button><button onClick={()=>window.print()}><Printer size={18}/>PDF / Imprimir</button><button onClick={saveModel}><Archive size={18}/>Guardar modelo</button><button onClick={()=>{setForm(freshQuote(settings));setSaved(false)}}><RotateCcw size={18}/>Nueva</button></div>
  </Card><aside className={`resultCard printArea ${calc.belowCost?'loss':''}`}><img src="/logo-ae.png" className="printLogo" alt="A&E Studio Laser"/><span>{calc.isManual?'Total manual':'Total sugerido'}</span><strong>{money(calc.total)}</strong><div className="unitPrice"><span>Precio por pieza</span><b>{money(calc.unit)}</b></div>{form.comments?.trim()&&<div className="resultComments"><b>Comentarios</b><span>{form.comments.trim()}</span></div>}<h3>Desglose</h3>{calc.isManual&&<Line label="Sugerencia automática" value={calc.automaticTotal}/>} {calc.catalogBase>0&&<Line label="Precio base de catálogo" value={calc.catalogBase}/>} {form.multicolor?calc.filamentLines.map((line,index)=><Line key={`${line.id}-${index}`} label={`${line.name} · ${line.grams} g`} value={line.cost}/>):<Line label="Material" value={calc.materialCost}/>}<Line label="Electricidad" value={calc.electricity}/><Line label="Desgaste" value={calc.wear}/><Line label={`Reserva por fallas (${num(form.failure)}%)`} value={calc.failureCost}/><Line label="Mano de obra" value={form.labor}/><Line label="Extras" value={form.extras}/><Line label="Costos conocidos" value={calc.productionCost} bold/><Line label={calc.profitAmount<0?'Pérdida':catalogItem?'Diferencia sobre costos conocidos':'Ganancia'} value={calc.profitAmount}/><small>{calc.isManual?`Precio manual · margen real ${calc.marginPercent.toFixed(1)}%. `:''}{form.multicolor?`Filamento total: ${calc.totalFilamentGrams.toFixed(1)} g. `:''}La reserva por fallas cubre material, electricidad y desgaste que habría que repetir. {catalogItem&&!calc.isManual?'Se respeta como mínimo el precio vigente del catálogo. ':''}Vigencia: {settings.quoteValidity||15} días</small></aside></div>
}

function ServiceQuote({service,inventory,setInventory,catalog:productCatalog,settings,quotes,setQuotes,orders,setOrders,clients,setClients,onOrderCreated}){
  const isLaser=service==='laser'
  const baseCatalog=(isLaser?settings.laserMaterials:settings.cricutMaterials)||(isLaser?defaults.laserMaterials:defaults.cricutMaterials)
  const rawInventory=(inventory||[]).filter(i=>i.category===service&&i.type==='raw'&&(i.trackingMode==='area'?num(i.areaRemaining)>0:num(i.stock)>0))
  const inventoryCatalog=rawInventory.map(i=>{
    const trackingMode=i.trackingMode||'units',isArea=trackingMode==='area',isSheets=trackingMode==='sheets'
    const available=isArea?num(i.areaRemaining):num(i.stock),unit=isArea?'cm²':isSheets?'hojas':'unidades'
    return{id:`stock-${i.id}`,name:`${i.name} (Disponibles: ${available.toFixed(isArea?0:2)} ${unit})`,pricingMode:isArea?'area':isSheets?'sheet':'unit',sheetWidth:num(i.materialWidth)||1,sheetHeight:num(i.materialLength)||1,sheetCost:unitCost(i),waste:0,inventoryId:i.id,trackingMode,available}
  })
  const catalog=[...baseCatalog,...inventoryCatalog]
  const catalogProducts=(productCatalog||[]).filter(p=>(p.service===service||p.service==='all')&&p.status!=='hidden')
  const inventoryProducts=(inventory||[]).filter(i=>i.category===service&&i.type==='product'&&num(i.stock)>0)
  const initialJobType=isLaser?'cut':'vinyl'
  const initial={client:'',project:'',comments:'',catalogProduct:'',jobType:initialJobType,materialSource:'studio',material:catalog[0]?.id||'',quantity:1,width:isLaser?30:10,height:isLaser?30:10,hours:0,minutes:isLaser?20:10,labor:0,design:0,assembly:0,extras:0,profit:num(settings.defaultProfit)||50,manualMaterial:'',priceMode:'auto',manualTotal:'',fullSheet:false,advanced:false,productionParams:createProductionParameters(service,defaultProfileForJob(service,initialJobType))}
  const [form,setForm]=useState(initial),[saved,setSaved]=useState(false)
  const update=(k,v)=>{setSaved(false);setForm({...form,[k]:v})}
  const material=catalog.find(m=>m.id===form.material)||catalog[0]||{name:'Material',sheetWidth:1,sheetHeight:1,sheetCost:0,waste:10}
  const catalogItem=catalogProducts.find(p=>p.id===form.catalogProduct)
  const inventoryProduct=inventoryProducts.find(p=>`stock-${p.id}`===form.catalogProduct)
  const selectedProduct=catalogItem?{...catalogItem,source:'catalog'}:inventoryProduct?{id:`stock-${inventoryProduct.id}`,name:inventoryProduct.name,price:num(inventoryProduct.salePrice)||unitCost(inventoryProduct),source:'inventory',inventoryId:inventoryProduct.id}:null
  const calc=useMemo(()=>{
    const w=Math.max(.1,num(form.width)),h=Math.max(.1,num(form.height)),qty=Math.max(1,num(form.quantity)),sw=Math.max(.1,num(material.sheetWidth)),sh=Math.max(.1,num(material.sheetHeight)),waste=Math.max(0,num(material.waste))/100,isMeter=material.pricingMode==='meter',isUnit=material.pricingMode==='unit',isArea=material.pricingMode==='area'
    const across=Math.max(1,Math.floor(sw/w)),down=Math.max(1,Math.floor(sh/h)),grid=across*down,areaCapacity=Math.max(1,Math.floor(sw*sh/(w*h*(1+waste)))),perSheet=Math.max(1,Math.min(grid,areaCapacity)),sheets=Math.ceil(qty/perSheet),rows=Math.ceil(qty/across),usedLength=rows*h*(1+waste)
    const usedArea=w*h*qty,proportionalUnit=num(material.sheetCost)/perSheet,includeMaterial=form.materialSource==='studio'
    const automaticMaterial=isUnit?num(material.sheetCost)*qty:isArea?(usedArea/(sw*sh))*num(material.sheetCost):isMeter?(usedLength/100)*num(material.sheetCost):material.trackingMode==='sheets'||form.fullSheet?calculateSheetMaterialCost(material.sheetCost,sheets):proportionalUnit*qty
    const materialCost=includeMaterial?(form.manualMaterial===''?automaticMaterial:num(form.manualMaterial)):0,materialUnit=materialCost/qty,machineHours=num(form.hours)+num(form.minutes)/60,rate=isLaser?num(settings.laserRate||defaults.laserRate):num(settings.cricutRate||defaults.cricutRate),machineCost=machineHours*rate,productionCost=materialCost+machineCost+num(form.labor)+num(form.design)+num(form.assembly)+num(form.extras)
    const productBase=num(selectedProduct?.price)*qty,addProductToService=!isLaser&&productBase>0,pricing=calculateServicePrice({productionCost,profitPercent:form.profit,productBase,roundTo:settings.roundTo,addProductToService})
    const productPurchaseCost=inventoryProduct?unitCost(inventoryProduct)*qty:0,knownTotalCost=productionCost+productPurchaseCost,finalPrice=resolveServiceFinalPrice({productionCost:knownTotalCost,automaticTotal:pricing.total,automaticProfitAmount:pricing.total-knownTotalCost,quantity:qty,priceMode:form.priceMode,manualTotal:form.manualTotal})
    const inventoryConsumption=!isLaser&&material.inventoryId&&includeMaterial?calculateCricutConsumption({width:w,height:h,quantity:qty,piecesPerSheet:perSheet,trackingMode:material.trackingMode}):null
    return{perSheet,sheets,materialUnit,materialCost,machineHours,machineCost,productionCost,productPurchaseCost,knownTotalCost,catalogBase:productBase,productBase,addProductToService,...finalPrice,personalizationPrice:pricing.personalizationPrice,isMeter,isUnit,isArea,usedArea,usedLength,across,inventoryConsumption}
  },[form,material,selectedProduct,inventoryProduct,isLaser,settings])
  const typeName=isLaser?({cut:'Corte',engrave:'Grabado',both:'Corte y grabado'}[form.jobType]):({vinyl:'Vinil',stickers:'Stickers',paper:'Papel/cartulina',printcut:'Impresión y corte'}[form.jobType])
  const snapshot=()=>({id:uid(),folio:`COT-${Date.now().toString().slice(-7)}`,date:new Date().toISOString(),service:isLaser?'Láser':'Cricut',...form,materialName:material.name,catalogName:selectedProduct?.name||'',typeName,...calc})
  const client=()=>{const n=form.client.trim();if(n&&!clients.some(c=>c.name.toLowerCase()===n.toLowerCase()))setClients([{id:uid(),name:n,phone:'',email:'',notes:''},...clients])}
  const save=()=>{const q=snapshot();setQuotes([q,...quotes]);client();setSaved(true);return q}
  const order=()=>{
    const materialItem=material.inventoryId&&inventory.find(i=>i.id===material.inventoryId),productItem=selectedProduct?.source==='inventory'&&inventory.find(i=>i.id===selectedProduct.inventoryId)
    if(productItem&&num(productItem.stock)<num(form.quantity))return alert(`No hay suficiente existencia de ${productItem.name}.`)
    if(materialItem&&calc.inventoryConsumption){
      const available=materialItem.trackingMode==='area'?num(materialItem.areaRemaining):num(materialItem.stock)
      if(available<calc.inventoryConsumption.amount)return alert(`No hay suficiente ${materialItem.name}. Disponible: ${available.toFixed(2)} ${calc.inventoryConsumption.unit}.`)
    }
    const q=save()
    if(productItem||materialItem)setInventory(inventory.map(item=>{
      if(productItem&&item.id===productItem.id)return{...item,stock:Math.max(0,num(item.stock)-num(form.quantity)),updatedAt:new Date().toISOString()}
      if(materialItem&&item.id===materialItem.id){
        if(item.trackingMode==='area')return{...item,areaRemaining:Math.max(0,num(item.areaRemaining)-calc.inventoryConsumption.amount),updatedAt:new Date().toISOString()}
        return{...item,stock:Math.max(0,num(item.stock)-calc.inventoryConsumption.amount),updatedAt:new Date().toISOString()}
      }
      return item
    }))
    const createdOrder={...q,id:uid(),quoteId:q.id,status:'pending',createdAt:new Date().toISOString(),dueDate:'',paymentDueDate:'',payments:[]}
    setOrders([createdOrder,...orders]);onOrderCreated?.(createdOrder)
    alert(`Cotización guardada y pedido creado.${materialItem||productItem?' Inventario actualizado.':''}`)
  }
  const message=()=>encodeURIComponent(`*${settings.businessName||'A&E Studio Laser'}*\nCotización\nCliente: ${form.client||'—'}\nProyecto: ${form.project||selectedProduct?.name||'—'}\nMedidas: ${form.width} × ${form.height} cm\nCantidad: ${form.quantity}${form.comments?.trim()?`\nComentarios: ${form.comments.trim()}`:''}\n*Total: ${money(calc.total)}*\nVigencia: ${settings.quoteValidity||15} días`)
  return <div className="quoteLayout"><Card title={`Cotizador ${isLaser?'láser':'Cricut'}`} subtitle="Medidas y tiempo de máquina para un resultado realista.">
    <Field label={isLaser?'Producto del catálogo o inventario (opcional)':'Producto base (opcional)'} full><select value={form.catalogProduct} onChange={e=>{const item=catalogProducts.find(p=>p.id===e.target.value)||inventoryProducts.find(p=>`stock-${p.id}`===e.target.value);setForm({...form,catalogProduct:e.target.value,project:form.project||item?.name||'',materialSource:isLaser&&item?'catalog':'studio'});setSaved(false)}}><option value="">Cotización desde cero</option>{catalogProducts.length>0&&<optgroup label="Catálogo">{catalogProducts.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</optgroup>}{inventoryProducts.length>0&&<optgroup label="Productos del inventario">{inventoryProducts.map(p=><option key={p.id} value={`stock-${p.id}`}>{p.name} — {money(num(p.salePrice)||unitCost(p))} · {num(p.stock)} disponibles</option>)}</optgroup>}</select></Field>
    <div className="formGrid">
    <Field label="Cliente"><input value={form.client} onChange={e=>update('client',e.target.value)} placeholder="Nombre del cliente"/></Field><Field label="Proyecto"><input value={form.project} onChange={e=>update('project',e.target.value)} placeholder={isLaser?'Ej. Caja para regalo':'Ej. Stickers personalizados'}/></Field><Field label="Detalles o comentarios" full><textarea rows="3" value={form.comments||''} onChange={e=>update('comments',e.target.value)} placeholder="Colores, acabados, nombres u otras indicaciones"/></Field>
    <Field label="Tipo de trabajo"><select value={form.jobType} onChange={e=>{const jobType=e.target.value;setForm({...form,jobType,materialSource:isLaser&&jobType==='engrave'?'client':'studio',productionParams:createProductionParameters(service,defaultProfileForJob(service,jobType))});setSaved(false)}}>{isLaser?<><option value="cut">Corte</option><option value="engrave">Grabado</option><option value="both">Corte y grabado</option></>:<><option value="vinyl">Vinil</option><option value="stickers">Stickers</option><option value="paper">Papel / cartulina</option><option value="printcut">Impresión y corte</option></>}</select></Field>
    <Field label="Origen del material o pieza"><select value={form.materialSource} onChange={e=>update('materialSource',e.target.value)}><option value="studio">Lo proporciona A&E</option><option value="client">Lo proporciona el cliente</option>{selectedProduct&&isLaser&&<option value="catalog">Incluido en el precio del producto</option>}</select></Field>
    <Field label="Material"><select disabled={form.materialSource!=='studio'} value={form.material} onChange={e=>update('material',e.target.value)}><optgroup label="Materiales configurados">{baseCatalog.map(m=><option key={m.id} value={m.id}>{m.name} — {money(m.sheetCost)}</option>)}</optgroup>{inventoryCatalog.length>0&&<optgroup label={`Inventario de ${isLaser?'Láser':'Cricut'}`}>{inventoryCatalog.map(m=><option key={m.id} value={m.id}>{m.name} — {money(m.sheetCost)} por compra</option>)}</optgroup>}</select></Field>
    <Field label="Cantidad"><input type="number" min="1" value={form.quantity} onChange={e=>update('quantity',e.target.value)}/></Field><div className="splitFields"><Field label="Ancho de pieza (cm)"><input type="number" min=".1" step=".1" value={form.width} onChange={e=>update('width',e.target.value)}/></Field><Field label="Alto de pieza (cm)"><input type="number" min=".1" step=".1" value={form.height} onChange={e=>update('height',e.target.value)}/></Field></div>
    <div className="splitFields"><Field label="Horas de máquina"><input type="number" min="0" value={form.hours} onChange={e=>update('hours',e.target.value)}/></Field><Field label="Minutos"><input type="number" min="0" max="59" value={form.minutes} onChange={e=>update('minutes',e.target.value)}/></Field></div><Field label="Mano de obra ($)"><input type="number" min="0" value={form.labor} onChange={e=>update('labor',e.target.value)}/></Field>
    <Field label={`Ganancia: ${form.profit}%`} full><input type="range" min="0" max="150" value={form.profit} onChange={e=>update('profit',e.target.value)}/></Field></div>
    <div className="priceModeBox"><div><b>Precio final</b><span>Usa el cálculo automático o define un total manual o promoción.</span></div><div className="priceModeOptions"><button className={form.priceMode!=='manual'?'active':''} onClick={()=>update('priceMode','auto')}>Automático</button><button className={form.priceMode==='manual'?'active':''} onClick={()=>update('priceMode','manual')}>Manual / promoción</button></div>{form.priceMode==='manual'&&<Field label="Total a cobrar ($)"><input type="number" min="0" step=".01" value={form.manualTotal} onChange={e=>update('manualTotal',e.target.value)} placeholder={String(calc.automaticTotal)}/></Field>}<div className={`priceHealth ${calc.belowCost?'warning':'healthy'}`}><span>Sugerencia automática: <b>{money(calc.automaticTotal)}</b></span>{calc.isManual&&<span>Utilidad real: <b>{money(calc.profitAmount)}</b> · Margen: <b>{calc.marginPercent.toFixed(1)}%</b></span>}{calc.belowCost&&<strong>El precio manual está por debajo de los costos registrados.</strong>}</div></div>
    <ProductionParameters service={service} value={form.productionParams} onChange={value=>update('productionParams',value)} jobType={form.jobType}/>
    <button className="detailsToggle" onClick={()=>update('advanced',!form.advanced)}>{form.advanced?'Ocultar detalles':'Más detalles opcionales'}</button>
    {form.advanced&&<div className="formGrid advancedBox"><Field label="Diseño / preparación ($)"><input type="number" min="0" value={form.design} onChange={e=>update('design',e.target.value)}/></Field><Field label="Armado / acabado ($)"><input type="number" min="0" value={form.assembly} onChange={e=>update('assembly',e.target.value)}/></Field><Field label="Extras ($)"><input type="number" min="0" value={form.extras} onChange={e=>update('extras',e.target.value)}/></Field><Field label="Costo de material manual ($)"><input type="number" min="0" value={form.manualMaterial} placeholder={money(calc.materialCost)} onChange={e=>update('manualMaterial',e.target.value)}/></Field>{!calc.isMeter&&!calc.isUnit&&!calc.isArea&&<label className="checkField"><input type="checkbox" checked={form.fullSheet} onChange={e=>update('fullSheet',e.target.checked)}/><span>Cobrar placa u hoja completa</span></label>}</div>}
    {selectedProduct&&<div className="usageNote catalogQuoteNote"><b>{selectedProduct.name}: {money(selectedProduct.price)} por pieza</b><span>{calc.addProductToService?'El producto base se suma al material y al trabajo de personalización.':selectedProduct.source==='inventory'?'Se usa como precio mínimo y se descontará del inventario al crear el pedido.':'Este precio se respeta como mínimo porque el producto está marcado como sobre pedido.'}</span></div>}
    <div className="usageNote">{form.materialSource==='catalog'?<><b>Producto incluido en el precio seleccionado</b><span>No se suma nuevamente como material. Si necesitas recalcularlo con un costo de compra actual, cambia el origen a “Lo proporciona A&E”.</span></>:form.materialSource==='client'?<><b>Material proporcionado por el cliente</b><span>El costo del material es $0. Solo se cobran máquina, diseño, mano de obra, acabado y extras.</span></>:calc.isUnit?<><b>{form.quantity} producto(s) a {money(material.sheetCost)} cada uno</b><span>Costo del producto base: {money(calc.materialCost)}. Configura el costo de compra por pieza en Inventario.</span></>:calc.isArea?<><b>{calc.usedArea.toFixed(2)} cm² de material para este trabajo</b><span>Costo proporcional: {money(calc.materialCost)}. Al crear el pedido se descontarán {calc.inventoryConsumption?.amount.toFixed(2)} cm² del inventario.</span></>:calc.isMeter?<><b>{calc.across} pieza(s) a lo ancho · {calc.usedLength.toFixed(1)} cm lineales utilizados</b><span>Costo del vinil utilizado: {money(calc.materialCost)} · rollo de {material.sheetWidth} cm de ancho a {money(material.sheetCost)} por metro · merma {material.waste||0}%.</span></>:<><b>{calc.perSheet} pieza(s) por placa/hoja · {calc.sheets} necesarias</b><span>Costo proporcional por pieza: {money(calc.materialUnit)} · formato de {material.sheetWidth} × {material.sheetHeight} cm a {money(material.sheetCost)} · merma {material.waste||0}%.{calc.inventoryConsumption?` Al crear el pedido se descontarán ${calc.inventoryConsumption.amount} hoja(s).`:''}</span></>}</div>
    {saved&&<div className="success"><Check size={17}/>Cotización guardada</div>}<div className="actions"><button className="primary" onClick={save}><Save size={18}/>Guardar</button><button onClick={order}><ClipboardList size={18}/>Crear pedido</button><button onClick={()=>window.location.href=`https://wa.me/?text=${message()}`}><MessageCircle size={18}/>WhatsApp</button><button onClick={()=>window.print()}><Printer size={18}/>PDF / Imprimir</button><button onClick={()=>{setForm(initial);setSaved(false)}}><RotateCcw size={18}/>Nueva</button></div>
  </Card><aside className={`resultCard printArea ${calc.belowCost?'loss':''}`}><img src="/logo-ae.png" className="printLogo" alt="A&E Studio Laser"/><span>{calc.isManual?'Total manual':'Total sugerido'}</span><strong>{money(calc.total)}</strong><div className="unitPrice"><span>Precio por pieza</span><b>{money(calc.unit)}</b></div>{form.comments?.trim()&&<div className="resultComments"><b>Comentarios</b><span>{form.comments.trim()}</span></div>}<h3>Desglose</h3>{calc.isManual&&<Line label="Sugerencia automática" value={calc.automaticTotal}/>} {calc.productBase>0&&<Line label={calc.addProductToService?'Producto base':'Precio base / mínimo'} value={calc.productBase}/>}<Line label="Material de personalización" value={calc.materialCost}/><Line label="Tiempo de máquina" value={calc.machineCost}/><Line label="Diseño" value={form.design}/><Line label="Mano de obra" value={form.labor}/><Line label="Armado / acabado" value={form.assembly}/><Line label="Extras" value={form.extras}/>{calc.productPurchaseCost>0&&<Line label="Costo de compra del producto" value={calc.productPurchaseCost}/>}<Line label={calc.productPurchaseCost>0?'Costos registrados':'Costos conocidos'} value={calc.knownTotalCost} bold/><Line label={calc.profitAmount<0?'Pérdida':calc.isManual?'Utilidad real':selectedProduct?'Utilidad estimada':'Ganancia'} value={calc.profitAmount}/><small>{calc.isManual?`Precio manual · margen real ${calc.marginPercent.toFixed(1)}%. `:calc.addProductToService?'Producto base + material + personalización · ':selectedProduct?'Precio usado como mínimo · ':''}{typeName} · {form.width} × {form.height} cm</small></aside></div>
}

const catalogStatus={order:'Sobre pedido',available:'Disponible',hidden:'Oculto'}
function Catalog({products,setProducts}){
  const [form,setForm]=useState(blankCatalogProduct),[editing,setEditing]=useState(null),[search,setSearch]=useState(''),[service,setService]=useState('all'),[category,setCategory]=useState('all')
  const categories=[...new Set(products.map(p=>p.category).filter(Boolean))].sort(),shown=products.filter(p=>(service==='all'||p.service===service||p.service==='all')&&(category==='all'||p.category===category)&&`${p.name} ${p.category} ${p.details}`.toLowerCase().includes(search.toLowerCase()))
  const save=()=>{if(!form.name.trim())return alert('Escribe el nombre del producto.');const item={...form,id:editing||uid(),price:num(form.price)};setProducts(editing?products.map(p=>p.id===editing?item:p):[item,...products]);setForm(blankCatalogProduct);setEditing(null)}
  const edit=p=>{setForm({...blankCatalogProduct,...p});setEditing(p.id);scrollTo({top:0,behavior:'smooth'})}
  return <><section className="catalogHero"><div><span>Importado desde tu catálogo de Canva</span><h2>{products.length} productos listos para cotizar</h2><p>Son productos sobre pedido: no se cuentan como inventario físico.</p></div><div><b>Precios de venta</b><small>Revísalos cuando cambie tu catálogo.</small></div></section>
    <Card title={editing?'Editar producto':'Agregar producto al catálogo'} subtitle="Guarda productos que puedes ofrecer aunque no los tengas físicamente."><div className="formGrid">
      <Field label="Producto"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Termo de 20 oz"/></Field>
      <Field label="Categoría"><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Ej. Termos"/></Field>
      <Field label="Cotizador"><select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="laser">Láser</option><option value="cricut">Cricut</option><option value="3d">Impresión 3D</option><option value="all">Todos</option></select></Field>
      <Field label="Precio de venta ($)"><input type="number" min="0" step=".01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field>
      <Field label="Disponibilidad"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="order">Sobre pedido</option><option value="available">Disponible</option><option value="hidden">Oculto</option></select></Field>
      <Field label="Detalles"><input value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Medida, capacidad, material o variante"/></Field>
    </div><div className="actions"><button className="primary" onClick={save}><Save size={18}/>{editing?'Guardar cambios':'Agregar producto'}</button>{editing&&<button onClick={()=>{setEditing(null);setForm(blankCatalogProduct)}}>Cancelar</button>}<button onClick={()=>confirm('¿Restaurar los productos importados desde Canva?')&&setProducts(defaultCatalog)}><RotateCcw size={18}/>Restaurar catálogo</button></div></Card>
    <Card title="Productos" subtitle={`${shown.length} visibles con estos filtros`}><SearchBox value={search} setValue={setSearch} placeholder="Buscar producto, categoría o detalle…"/><div className="catalogFilters"><select value={service} onChange={e=>setService(e.target.value)}><option value="all">Todos los cotizadores</option><option value="laser">Láser</option><option value="cricut">Cricut</option><option value="3d">Impresión 3D</option></select><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Todas las categorías</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      {shown.length?<div className="catalogGrid">{shown.map(p=><article className="catalogCard" key={p.id}><div className="catalogTop"><span>{p.category}</span><span className={`catalogBadge ${p.status}`}>{catalogStatus[p.status]||'Sobre pedido'}</span></div><h3>{p.name}</h3><p>{p.details||'Producto personalizable.'}</p><div className="catalogBottom"><strong>{money(p.price)}</strong><small>{p.service==='laser'?'Láser':p.service==='cricut'?'Cricut':p.service==='3d'?'Impresión 3D':'Todos'}</small></div><div className="rowActions"><button onClick={()=>edit(p)}>Editar</button><button className="iconButton danger" aria-label={`Eliminar ${p.name}`} onClick={()=>confirm(`¿Eliminar ${p.name}?`)&&setProducts(products.filter(x=>x.id!==p.id))}><Trash2 size={16}/></button></div></article>)}</div>:<Empty text="No hay productos con estos filtros."/>}</Card></>
}

const labels={pending:'Pendiente',process:'En proceso',ready:'Listo',delivered:'Entregado',cancelled:'Cancelado'}
function Status({value}){return <span className={`status ${value}`}>{labels[value]||value}</span>}
function Orders({orders,setOrders}){
  const [filter,setFilter]=useState('all'),[paymentFilter,setPaymentFilter]=useState('all')
  const update=(id,patch)=>setOrders(current=>current.map(order=>order.id===id?{...order,...patch}:order))
  const replace=updated=>setOrders(current=>current.map(order=>order.id===updated.id?updated:order))
  const activeOrders=orders.filter(order=>order.status!=='cancelled')
  const collected=activeOrders.reduce((sum,order)=>sum+paymentSummary(order).paid,0)
  const receivable=activeOrders.reduce((sum,order)=>sum+paymentSummary(order).balance,0)
  const overdue=activeOrders.filter(order=>isPaymentOverdue(order)).length
  const shown=orders.filter(order=>{
    const productionMatches=filter==='all'||order.status===filter
    const paymentMatches=paymentFilter==='all'||paymentSummary(order).status===paymentFilter
    return productionMatches&&paymentMatches
  })
  const changeStatus=(order,status)=>{
    const balance=paymentSummary(order).balance
    if(status==='delivered'&&balance>0&&!confirm(`Este pedido todavía tiene un saldo de ${money(balance)}. ¿Marcarlo como entregado de todos modos?`))return
    update(order.id,{status})
  }
  return <><div className="stats compact paymentStats"><Stat label="Pedidos activos" value={activeOrders.length} tone="blue"/><Stat label="Cobrado" value={money(collected)} tone="green"/><Stat label="Por cobrar" value={money(receivable)} tone="orange"/><Stat label="Pagos vencidos" value={overdue} tone="purple"/></div>
    <Card title="Pedidos y pagos" subtitle="Controla por separado la producción, los anticipos y el saldo de cada cliente."><div className="orderFilters"><div className="filters">{['all','pending','process','ready','delivered','cancelled'].map(id=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{id==='all'?'Todos':labels[id]}</button>)}</div><label className="paymentFilter"><span>Estado de pago</span><select value={paymentFilter} onChange={event=>setPaymentFilter(event.target.value)}><option value="all">Todos</option><option value="unpaid">Sin pago</option><option value="partial">Pago parcial</option><option value="paid">Pagado</option></select></label></div>
    {shown.length?<div className="cardsList">{shown.map(order=><article className={`orderCard ${isPaymentOverdue(order)?'paymentOverdue':''}`} key={order.id}><div><div className="orderBadges"><Status value={order.status}/>{isPaymentOverdue(order)&&<span className="overdueBadge">Pago vencido</span>}</div><h3>{order.project||'Pedido'}</h3><p>{order.client||'Sin cliente'} · {order.quantity} pieza(s)</p>{order.comments?.trim()&&<p className="orderComments">{order.comments}</p>}{order.productionParams?.profileName&&<p className="orderParameters">Parámetros: {order.productionParams.profileName}</p>}</div><b className="orderTotal">{money(order.total)}</b><Field label="Estado del pedido"><select value={order.status} onChange={event=>changeStatus(order,event.target.value)}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field><Field label="Fecha de entrega"><input type="date" value={order.dueDate||''} onChange={event=>update(order.id,{dueDate:event.target.value})}/></Field><button className="iconButton danger" aria-label="Eliminar pedido" onClick={()=>confirm('¿Eliminar este pedido y su historial de pagos?')&&setOrders(current=>current.filter(item=>item.id!==order.id))}><Trash2 size={17}/></button><OrderPayments order={order} onChange={replace}/></article>)}</div>:<Empty text="No hay pedidos con estos filtros."/>}</Card></>
}

function Inventory({items,setItems}){
  const [form,setForm]=useState(freshStock),[editing,setEditing]=useState(null),[search,setSearch]=useState(''),shown=items.filter(i=>`${i.name} ${i.category} ${i.supplier}`.toLowerCase().includes(search.toLowerCase()))
  const cricutRaw=form.type==='raw'&&form.category==='cricut',printRaw=form.type==='raw'&&form.category==='3d',tracksArea=cricutRaw&&form.trackingMode==='area',tracksSheets=cricutRaw&&form.trackingMode==='sheets'
  const purchasedArea=num(form.materialWidth)*num(form.materialLength)*Math.max(1,num(form.purchaseQty)),displayArea=num(form.areaRemaining)>0?num(form.areaRemaining):purchasedArea
  const save=()=>{
    if(!form.name.trim())return alert('Escribe el nombre.')
    let item={...form,id:editing||uid(),updatedAt:new Date().toISOString()}
    if(tracksArea)item={...item,stock:Math.max(1,num(form.purchaseQty)),areaRemaining:displayArea}
    if(!editing&&(tracksSheets||printRaw)&&num(form.stock)===1)item={...item,stock:num(form.purchaseQty)}
    setItems(editing?items.map(i=>i.id===editing?item:i):[item,...items])
    setForm(freshStock);setEditing(null)
  }
  const available=i=>i.trackingMode==='area'?num(i.areaRemaining):num(i.stock)
  const inventoryValue=i=>i.trackingMode==='area'?unitCost(i)*(num(i.areaRemaining)/Math.max(1,num(i.materialWidth)*num(i.materialLength))):unitCost(i)*num(i.stock)
  const investment=items.reduce((s,i)=>s+inventoryValue(i),0),potential=items.reduce((s,i)=>s+num(i.salePrice)*num(i.stock),0)
  return <><div className="stats compact"><Stat label="Artículos" value={items.length} tone="blue"/><Stat label="Dinero invertido" value={money(investment)} tone="purple"/><Stat label="Venta potencial" value={money(potential)} tone="green"/><Stat label="Stock bajo" value={items.filter(i=>available(i)<=num(i.minStock)).length} tone="orange"/></div>
    <Card title={editing?'Editar artículo':'Agregar al inventario'} subtitle="Registra productos, vinil por superficie o papel y stickers por hojas.">
      <div className="formGrid">
        <Field label="Tipo"><select value={form.type} onChange={e=>{const type=e.target.value,trackingMode=type==='raw'&&form.category==='cricut'?'area':type==='raw'&&form.category==='3d'?'grams':'units';setForm({...form,type,trackingMode})}}><option value="product">Producto para venta</option><option value="raw">Materia prima</option></select></Field>
        <Field label="Nombre"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={cricutRaw?'Ej. Vinil rojo textil':'Ej. Termo 20 oz'}/></Field>
        <Field label="Categoría del cotizador"><select value={form.category} onChange={e=>{const category=e.target.value,trackingMode=form.type==='raw'&&category==='cricut'?'area':form.type==='raw'&&category==='3d'?'grams':'units';setForm({...form,category,trackingMode})}}><option value="laser">Láser</option><option value="3d">Impresión 3D</option><option value="cricut">Cricut</option></select></Field>
        <Field label="Proveedor"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field>
        {cricutRaw&&<Field label="Controlar existencia por"><select value={form.trackingMode} onChange={e=>setForm({...form,trackingMode:e.target.value})}><option value="area">Superficie (vinil)</option><option value="sheets">Cantidad de hojas (stickers, papel o cartulina)</option></select></Field>}
        <Field label={tracksSheets?'Hojas compradas':tracksArea?'Rollos o tramos comprados':printRaw?'Filamento comprado (g)':'Cantidad comprada'}><input type="number" min="1" step={printRaw?'.1':'1'} value={form.purchaseQty} onChange={e=>setForm({...form,purchaseQty:e.target.value})}/></Field>
        <Field label="Costo total de compra ($)"><input type="number" min="0" step=".01" value={form.purchaseTotal} onChange={e=>setForm({...form,purchaseTotal:e.target.value})}/></Field>
        {cricutRaw&&<><Field label="Ancho del material u hoja (cm)"><input type="number" min=".1" step=".1" value={form.materialWidth} onChange={e=>setForm({...form,materialWidth:e.target.value})}/></Field><Field label="Alto o largo (cm)"><input type="number" min=".1" step=".1" value={form.materialLength} onChange={e=>setForm({...form,materialLength:e.target.value})}/></Field></>}
        {tracksArea?<><Field label="Superficie disponible actual (cm²)"><input type="number" min="0" step=".01" value={form.areaRemaining} onChange={e=>setForm({...form,areaRemaining:e.target.value})} placeholder={String(purchasedArea)}/></Field><Field label="Alerta mínima (cm²)"><input type="number" min="0" step=".01" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})}/></Field></>:<><Field label={tracksSheets?'Hojas en existencia':printRaw?'Filamento disponible (g)':'Existencia actual'}><input type="number" min="0" step={printRaw?'.1':'1'} value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></Field><Field label={tracksSheets?'Alerta mínima de hojas':printRaw?'Alerta mínima (g)':'Existencia mínima'}><input type="number" min="0" step={printRaw?'.1':'1'} value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})}/></Field></>}
        {form.type==='product'&&<Field label="Precio de venta por pieza ($)"><input type="number" min="0" step=".01" value={form.salePrice} onChange={e=>setForm({...form,salePrice:e.target.value})}/></Field>}
        <Field label="Fecha de compra"><input type="date" value={form.purchaseDate} onChange={e=>setForm({...form,purchaseDate:e.target.value})}/></Field>
      </div>
      <div className="calculated">{tracksArea?<><span>Superficie disponible <b>{displayArea.toFixed(2)} cm²</b></span><span>Equivale a <b>{remainingAreaLength(displayArea,form.materialWidth).toFixed(2)} cm lineales</b></span><span>Costo por cm² <b>{money(unitCost(form)/Math.max(1,num(form.materialWidth)*num(form.materialLength)))}</b></span></>:tracksSheets?<span>Costo por hoja <b>{money(unitCost(form))}</b></span>:printRaw?<><span>Costo por gramo <b>{money(unitCost(form))}</b></span><span>Costo por kg <b>{money(unitCost(form)*1000)}</b></span></>:<><span>Costo unitario <b>{money(unitCost(form))}</b></span>{form.type==='product'&&<span>Ganancia por unidad <b>{money(num(form.salePrice)-unitCost(form))}</b></span>}</>}</div>
      <div className="actions"><button className="primary" onClick={save}><Save size={18}/>{editing?'Guardar cambios':'Agregar'}</button>{editing&&<button onClick={()=>{setEditing(null);setForm(freshStock)}}>Cancelar</button>}</div>
    </Card>
    <Card title="Existencias" subtitle={`${shown.length} artículos`}><SearchBox value={search} setValue={setSearch} placeholder="Buscar material, producto o proveedor…"/>{shown.length?<div className="inventoryGrid">{shown.map(i=>{const isArea=i.trackingMode==='area',isSheets=i.trackingMode==='sheets',isGrams=i.trackingMode==='grams',existence=isArea?`${num(i.areaRemaining).toFixed(2)} cm² (~${remainingAreaLength(i.areaRemaining,i.materialWidth).toFixed(2)} cm lineales)`:isSheets?`${num(i.stock)} hojas`:isGrams?`${num(i.stock)} g`:num(i.stock),costValue=isGrams?unitCost(i)*1000:unitCost(i);return <article className="inventoryCard" key={i.id}><div className="inventoryIcon">{i.type==='raw'?<Box/>:<Package/>}</div><div className="grow"><div className="itemTitle"><h3>{i.name}</h3>{available(i)<=num(i.minStock)&&<span className="stockAlert">Stock bajo</span>}</div><p>{categoryName(i.category)} · {i.supplier||'Sin proveedor'}</p><div className="itemNumbers"><span>Existencia <b>{existence}</b></span><span>Costo {isArea?'por compra':isSheets?'por hoja':isGrams?'por kg':''}<b>{money(costValue)}</b></span>{i.type==='product'&&<span>Venta <b>{money(i.salePrice)}</b></span>}</div></div><div className="rowActions"><button onClick={()=>{const category=['laser','3d','cricut'].includes(i.category)?i.category:'laser',trackingMode=i.type==='raw'&&category==='cricut'&&!['area','sheets'].includes(i.trackingMode)?'area':i.type==='raw'&&category==='3d'&&i.trackingMode!=='grams'?'grams':i.trackingMode||'units';setEditing(i.id);setForm({...freshStock,...i,category,trackingMode});scrollTo({top:0,behavior:'smooth'})}}>Editar</button><button className="iconButton danger" onClick={()=>confirm('¿Eliminar este artículo?')&&setItems(items.filter(x=>x.id!==i.id))}><Trash2 size={16}/></button></div></article>})}</div>:<Empty text="Todavía no hay artículos registrados."/>}</Card></>
}

function Clients({clients,setClients}){
  const [form,setForm]=useState(freshClient),[editing,setEditing]=useState(null),[search,setSearch]=useState(''),shown=clients.filter(c=>`${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase()))
  const save=()=>{if(!form.name.trim())return alert('Escribe el nombre.');const c={...form,id:editing||uid()};setClients(editing?clients.map(x=>x.id===editing?c:x):[c,...clients]);setForm(freshClient);setEditing(null)}
  return <><Card title={editing?'Editar cliente':'Nuevo cliente'} subtitle="Guarda sus datos para futuras cotizaciones."><div className="formGrid"><Field label="Nombre"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Teléfono / WhatsApp"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Correo"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Notas"><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field></div><div className="actions"><button className="primary" onClick={save}><Save size={18}/>Guardar cliente</button>{editing&&<button onClick={()=>{setEditing(null);setForm(freshClient)}}>Cancelar</button>}</div></Card>
    <Card title="Directorio" subtitle={`${shown.length} clientes`}><SearchBox value={search} setValue={setSearch} placeholder="Buscar cliente…"/>{shown.length?shown.map(c=><div className="listRow clientRow" key={c.id}><div className="avatar"><UserRound/></div><div className="grow"><b>{c.name}</b><span>{c.phone||c.email||'Sin contacto'}</span></div><button onClick={()=>{setEditing(c.id);setForm(c)}}>Editar</button><button className="iconButton danger" onClick={()=>confirm('¿Eliminar este cliente?')&&setClients(clients.filter(x=>x.id!==c.id))}><Trash2 size={16}/></button></div>):<Empty text="Aún no hay clientes."/>}</Card></>
}

function Quotes({quotes,setQuotes}){
  const [search,setSearch]=useState(''),shown=quotes.filter(q=>`${q.client} ${q.project} ${q.folio}`.toLowerCase().includes(search.toLowerCase()))
  return <Card title="Cotizaciones" subtitle={`${quotes.length} guardadas`}><SearchBox value={search} setValue={setSearch} placeholder="Buscar por cliente, proyecto o folio…"/>{shown.length?<div className="tableWrap"><table><thead><tr><th>Fecha</th><th>Servicio</th><th>Folio</th><th>Cliente</th><th>Proyecto</th><th>Total</th><th/></tr></thead><tbody>{shown.map(q=><tr key={q.id}><td>{new Date(q.date).toLocaleDateString('es-MX')}</td><td>{q.service||'Impresión 3D'}</td><td>{q.folio||'—'}</td><td>{q.client||'—'}</td><td>{q.project||'—'}</td><td><b>{money(q.total)}</b></td><td><button className="iconButton danger" onClick={()=>confirm('¿Eliminar esta cotización?')&&setQuotes(quotes.filter(x=>x.id!==q.id))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>:<Empty text="Todavía no hay cotizaciones."/>}</Card>
}

function Models({models,setModels,settings}){
  const [form,setForm]=useState({name:'',material:settings.materials[0]?.id||'pla',weight:0,hours:0,minutes:0})
  const save=()=>{if(!form.name.trim())return alert('Escribe el nombre.');setModels([{...form,id:uid()},...models]);setForm({...form,name:'',weight:0,hours:0,minutes:0})}
  return <><Card title="Nuevo modelo frecuente" subtitle="Guarda diseños para cotizar más rápido."><div className="formGrid"><Field label="Nombre"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Material"><select value={form.material} onChange={e=>setForm({...form,material:e.target.value})}>{settings.materials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></Field><Field label="Peso (g)"><input type="number" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/></Field><div className="splitFields"><Field label="Horas"><input type="number" value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})}/></Field><Field label="Minutos"><input type="number" value={form.minutes} onChange={e=>setForm({...form,minutes:e.target.value})}/></Field></div></div><div className="actions"><button className="primary" onClick={save}><Save size={18}/>Guardar modelo</button></div></Card>
    <Card title="Biblioteca de modelos" subtitle={`${models.length} modelos`}>{models.length?<div className="modelGrid">{models.map(m=><article key={m.id}><div className="modelIcon"><Box/></div><h3>{m.name}</h3><p>{settings.materials.find(x=>x.id===m.material)?.name||'Material'} · {m.weight} g</p><span>{m.hours} h {m.minutes} min</span><button className="iconButton danger" onClick={()=>confirm('¿Eliminar este modelo?')&&setModels(models.filter(x=>x.id!==m.id))}><Trash2 size={16}/></button></article>)}</div>:<Empty text="Aún no hay modelos guardados."/>}</Card></>
}

function SettingsPage({settings,setSettings}){
  const [draft,setDraft]=useState(settings);useEffect(()=>setDraft(settings),[settings])
  const mat=(id,k,v)=>setDraft({...draft,materials:draft.materials.map(m=>m.id===id?{...m,[k]:v}:m)})
  return <Card title="Configuración" subtitle="Ajusta los costos del cotizador."><div className="formGrid"><Field label="Nombre del negocio"><input value={draft.businessName||''} onChange={e=>setDraft({...draft,businessName:e.target.value})}/></Field><Field label="Teléfono / WhatsApp"><input value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})}/></Field><Field label="Impresora"><input value={draft.printer} onChange={e=>setDraft({...draft,printer:e.target.value})}/></Field><Field label="Electricidad ($/kWh)"><input type="number" step=".01" value={draft.electricityPrice} onChange={e=>setDraft({...draft,electricityPrice:e.target.value})}/></Field><Field label="Consumo (W)"><input type="number" value={draft.printerWatts} onChange={e=>setDraft({...draft,printerWatts:e.target.value})}/></Field><Field label="Desgaste 3D por hora"><input type="number" value={draft.wearPerHour} onChange={e=>setDraft({...draft,wearPerHour:e.target.value})}/></Field><Field label="Falla predeterminada 3D (%)"><input type="number" min="0" max="100" value={draft.failureRate??defaults.failureRate} onChange={e=>setDraft({...draft,failureRate:e.target.value})}/></Field><Field label="Láser: costo por hora"><input type="number" value={draft.laserRate??defaults.laserRate} onChange={e=>setDraft({...draft,laserRate:e.target.value})}/></Field><Field label="Cricut: costo por hora"><input type="number" value={draft.cricutRate??defaults.cricutRate} onChange={e=>setDraft({...draft,cricutRate:e.target.value})}/></Field><Field label="Ganancia predeterminada (%)"><input type="number" value={draft.defaultProfit} onChange={e=>setDraft({...draft,defaultProfit:e.target.value})}/></Field><Field label="Redondear a ($)"><input type="number" value={draft.roundTo} onChange={e=>setDraft({...draft,roundTo:e.target.value})}/></Field><Field label="Vigencia (días)"><input type="number" value={draft.quoteValidity||15} onChange={e=>setDraft({...draft,quoteValidity:e.target.value})}/></Field></div>
    <div className="sectionHeader"><div><h3>Materiales de impresión 3D</h3><p>Precio por kilogramo</p></div><button onClick={()=>setDraft({...draft,materials:[...draft.materials,{id:uid(),name:'Nuevo material',priceKg:0}]})}><Plus size={17}/>Agregar</button></div><div className="materials">{draft.materials.map(m=><div className="materialRow" key={m.id}><input value={m.name} onChange={e=>mat(m.id,'name',e.target.value)}/><input type="number" value={m.priceKg} onChange={e=>mat(m.id,'priceKg',e.target.value)}/><button className="iconButton danger" onClick={()=>setDraft({...draft,materials:draft.materials.filter(x=>x.id!==m.id)})}><Trash2 size={17}/></button></div>)}</div>
    <SheetCatalog title="Materiales de láser" allowUnit list={draft.laserMaterials||defaults.laserMaterials} onChange={list=>setDraft({...draft,laserMaterials:list})}/>
    <SheetCatalog title="Materiales de Cricut" allowMeter list={draft.cricutMaterials||defaults.cricutMaterials} onChange={list=>setDraft({...draft,cricutMaterials:list})}/>
    <div className="actions"><button className="primary" onClick={()=>{setSettings(draft);alert('Configuración guardada.')}}><Save size={18}/>Guardar configuración</button><button onClick={()=>setDraft(defaults)}><RotateCcw size={18}/>Restaurar</button></div><div className="syncNotice"><Cloud/><div><b>Sincronización entre dispositivos</b><p>Abre la sección Sincronización para conectar tu cuenta y mantener estos costos disponibles en celular y computadora.</p></div></div></Card>
}

function SheetCatalog({title,list,onChange,allowMeter=false,allowUnit=false}){
  const update=(id,key,value)=>onChange(list.map(m=>m.id===id?{...m,[key]:value}:m))
  return <><div className="sectionHeader"><div><h3>{title}</h3><p>{allowMeter?'Selecciona si compras por metro de rollo o por hoja':allowUnit?'Compra por placa, hoja o por pieza':'Tamaño de placa u hoja en centímetros'}</p></div><button onClick={()=>onChange([...list,{id:uid(),name:'Nuevo material',pricingMode:allowMeter?'meter':'sheet',sheetWidth:30,sheetHeight:allowMeter?100:30,sheetCost:0,waste:0}])}><Plus size={17}/>Agregar</button></div>
    <div className="sheetMaterials">{list.map(m=><div className="sheetRow" key={m.id}>
      <label className="sheetField"><span>Material</span><input value={m.name} onChange={e=>update(m.id,'name',e.target.value)} placeholder="Material"/></label>
      {(allowMeter||allowUnit)&&<label className="sheetField"><span>Forma de compra</span><select value={m.pricingMode||'sheet'} onChange={e=>{const mode=e.target.value;onChange(list.map(x=>x.id===m.id?{...x,pricingMode:mode,sheetHeight:mode==='meter'?100:x.sheetHeight}:x))}}>{allowMeter&&<option value="meter">Rollo por metro</option>}<option value="sheet">Por hoja / placa</option>{allowUnit&&<option value="unit">Por pieza</option>}</select></label>}
      <label className="sheetField"><span>{m.pricingMode==='meter'?'Ancho del rollo (cm)':m.pricingMode==='unit'?'Ancho del producto (cm)':'Ancho de hoja / placa (cm)'}</span><input type="number" step=".1" value={m.sheetWidth} onChange={e=>update(m.id,'sheetWidth',e.target.value)} placeholder="Ancho"/></label>
      <label className="sheetField"><span>{m.pricingMode==='meter'?'Largo base (100 cm)':m.pricingMode==='unit'?'Alto del producto (cm)':'Largo de hoja / placa (cm)'}</span><input type="number" step=".1" disabled={m.pricingMode==='meter'} value={m.pricingMode==='meter'?100:m.sheetHeight} onChange={e=>update(m.id,'sheetHeight',e.target.value)} placeholder="Largo"/></label>
      <label className="sheetField"><span>{m.pricingMode==='meter'?'Costo por metro ($)':m.pricingMode==='unit'?'Costo de compra por pieza ($)':'Costo por hoja / placa ($)'}</span><input type="number" step=".01" value={m.sheetCost} onChange={e=>update(m.id,'sheetCost',e.target.value)} placeholder="Costo"/></label>
      {m.pricingMode!=='unit'&&<label className="sheetField"><span>Merma (%)</span><input type="number" step="1" value={m.waste} onChange={e=>update(m.id,'waste',e.target.value)} placeholder="%"/></label>}
      <button className="iconButton danger" aria-label={`Eliminar ${m.name}`} onClick={()=>onChange(list.filter(x=>x.id!==m.id))}><Trash2 size={17}/></button>
    </div>)}</div></>
}

function ProductionParameters({service,value,onChange,jobType}){
  const profiles=productionProfiles[service]||productionProfiles['3d']
  const current=value?.service===service?value:createProductionParameters(service,profiles[0]?.id)
  const selected=profiles.find(profile=>profile.id===current.profileId)||profiles[0]
  const update=(key,next)=>onChange({...current,[key]:next})
  const selectProfile=id=>onChange(createProductionParameters(service,id))
  return <details className="productionParameters">
    <summary><span><b>Parámetros sugeridos</b><small>{current.profileName||selected?.name} · opcional y editable</small></span><Settings size={18}/></summary>
    <div className="parameterBody">
      <div className="parameterIntro"><div><b>Perfil de producción</b><span>Selecciona el trabajo más parecido y ajusta después de una prueba.</span></div><select value={current.profileId||selected?.id} onChange={event=>selectProfile(event.target.value)}>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></div>
      {selected?.description&&<p className="parameterDescription">{selected.description}</p>}
      {service==='3d'&&<div className="parameterGrid">
        <Field label="Boquilla (mm)"><input type="number" min=".2" max=".8" step=".2" value={current.nozzle} onChange={event=>update('nozzle',event.target.value)}/></Field>
        <Field label="Altura de capa (mm)"><input type="number" min=".08" max=".4" step=".02" value={current.layerHeight} onChange={event=>update('layerHeight',event.target.value)}/></Field>
        <Field label="Paredes"><input type="number" min="1" step="1" value={current.walls} onChange={event=>update('walls',event.target.value)}/></Field>
        <Field label="Capas superiores/inferiores"><input type="number" min="1" step="1" value={current.topBottom} onChange={event=>update('topBottom',event.target.value)}/></Field>
        <Field label="Relleno (%)"><input type="number" min="0" max="100" step="1" value={current.infill} onChange={event=>update('infill',event.target.value)}/></Field>
        <Field label="Patrón de relleno"><input value={current.pattern||''} onChange={event=>update('pattern',event.target.value)}/></Field>
        <Field label="Soportes" full><input value={current.supports||''} onChange={event=>update('supports',event.target.value)}/></Field>
        <Field label="Adherencia" full><input value={current.adhesion||''} onChange={event=>update('adhesion',event.target.value)}/></Field>
      </div>}
      {service==='laser'&&<>
        <div className="parameterGrid">
          <Field label="Velocidad (mm/min)"><input type="number" min="1" step="10" value={current.speed} onChange={event=>update('speed',event.target.value)}/></Field>
          <Field label="Potencia (%)"><input type="number" min="1" max="100" step="1" value={current.power} onChange={event=>update('power',event.target.value)}/></Field>
          <Field label="Pasadas"><input type="number" min="1" step="1" value={current.passes} onChange={event=>update('passes',event.target.value)}/></Field>
          <Field label="Air Assist"><select value={current.airAssist||''} onChange={event=>update('airAssist',event.target.value)}><option>Encendido</option><option>Apagado o bajo</option><option>Apagado</option></select></Field>
          <Field label="Modo de potencia"><select value={current.mode||''} onChange={event=>update('mode',event.target.value)}><option>M3 · potencia constante</option><option>M4 · potencia dinámica</option></select></Field>
          <Field label="Enfoque"><input value={current.focus||''} onChange={event=>update('focus',event.target.value)}/></Field>
        </div>
        {jobType==='both'&&<p className="parameterTip">Corte y grabado usan capas separadas en LightBurn. Guarda aquí la capa principal y anota la segunda en Comentarios.</p>}
        <p className="parameterWarning">Nunca cortes vinil/PVC ni plásticos de composición desconocida. Para cortar, mantén extracción, vigilancia y Air Assist.</p>
      </>}
      {service==='cricut'&&<div className="parameterGrid">
        <Field label="Ajuste en Design Space" full><input value={current.designSpaceSetting||''} onChange={event=>update('designSpaceSetting',event.target.value)}/></Field>
        <Field label="Presión"><select value={current.pressure||'Predeterminada'} onChange={event=>update('pressure',event.target.value)}><option>Menos</option><option>Predeterminada</option><option>Más</option></select></Field>
        <Field label="Pasadas"><input type="number" min="1" step="1" value={current.passes} onChange={event=>update('passes',event.target.value)}/></Field>
        <Field label="Cuchilla"><input value={current.blade||''} onChange={event=>update('blade',event.target.value)}/></Field>
        <Field label="Espejo"><select value={current.mirror||'No'} onChange={event=>update('mirror',event.target.value)}><option>No</option><option>Sí</option></select></Field>
        <Field label="Tapete"><input value={current.mat||''} onChange={event=>update('mat',event.target.value)}/></Field>
      </div>}
      <p className="parameterFootnote">Estos parámetros son notas internas de producción: se guardan con la cotización o el pedido y no cambian el precio automáticamente.</p>
    </div>
  </details>
}

function Card({title,subtitle,children}){return <section className="card"><div className="cardTitle"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></div>{children}</section>}
function Field({label,children,full}){return <label className={`field ${full?'full':''}`}><span>{label}</span>{children}</label>}
function Line({label,value,bold}){return <div className={`line ${bold?'bold':''}`}><span>{label}</span><b>{money(value)}</b></div>}
function Stat({label,value,tone}){return <article className={`stat ${tone}`}><span>{label}</span><strong>{value}</strong></article>}
function Empty({text}){return <div className="empty"><Archive/><p>{text}</p></div>}
function SearchBox({value,setValue,placeholder}){return <label className="searchBox"><Search size={18}/><input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/></label>}
createRoot(document.getElementById('root')).render(<App/>)
