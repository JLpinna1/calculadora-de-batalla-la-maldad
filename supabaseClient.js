/*
 Battle Lab 1914 · Supabase client
 Etapa 23

 Esta capa permite usar Supabase real si el usuario coloca:
 - SUPABASE_URL
 - SUPABASE_ANON_KEY

 Si no hay configuración, la app sigue funcionando en modo local.
*/

const SUPABASE_CONFIG_KEY = "battleLab1914.stage23.supabaseConfig";

function getSupabaseConfig(){
  try{
    return JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || "{}");
  }catch(error){
    return {};
  }
}

function saveSupabaseConfig(url, anonKey){
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({
    url: String(url || "").trim(),
    anonKey: String(anonKey || "").trim()
  }));
}

function clearSupabaseConfig(){
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
}

function hasSupabaseConfig(){
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

function getSupabaseClient(){
  const cfg = getSupabaseConfig();
  if(!cfg.url || !cfg.anonKey) return null;
  if(!window.supabase || !window.supabase.createClient) return null;
  if(!window.__battleLabSupabaseClient){
    window.__battleLabSupabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
  }
  return window.__battleLabSupabaseClient;
}

async function getSupabaseUser(){
  const client = getSupabaseClient();
  if(!client) return null;
  const {data, error} = await client.auth.getUser();
  if(error) return null;
  return data.user || null;
}

async function signUpWithSupabase({email,password,profile}){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const {data, error} = await client.auth.signUp({
    email,
    password,
    options:{data:profile || {}}
  });
  if(error) throw error;
  if(data.user){
    await upsertSupabaseProfile(data.user.id, profile);
  }
  return data;
}

async function signInWithSupabase({email,password}){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const {data, error} = await client.auth.signInWithPassword({email,password});
  if(error) throw error;
  return data;
}

async function signOutSupabase(){
  const client = getSupabaseClient();
  if(!client) return;
  await client.auth.signOut();
}

async function upsertSupabaseProfile(userId, profile){
  const client = getSupabaseClient();
  if(!client || !userId) return null;
  const payload = {
    id:userId,
    username:profile?.name || profile?.username || "Jugador",
    country:profile?.country || "",
    role:profile?.role || "General",
    updated_at:new Date().toISOString()
  };
  const {data, error} = await client.from("player_profiles").upsert(payload).select().single();
  if(error) throw error;
  return data;
}

async function saveSupabaseScenario({name, mode, snapshot, visibility="private"}){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {data, error} = await client.from("scenarios").insert({
    user_id:user.id,
    name,
    mode,
    snapshot,
    visibility
  }).select().single();
  if(error) throw error;
  return data;
}

async function listSupabaseScenarios(){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const {data, error} = await client.from("scenarios").select("*").order("created_at",{ascending:false});
  if(error) throw error;
  return data || [];
}

async function saveSupabaseHistory({scenarioId=null, winner, result, scenarioSnapshot, note=""}){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {data, error} = await client.from("simulation_history").insert({
    user_id:user.id,
    scenario_id:scenarioId,
    winner,
    result,
    scenario_snapshot:scenarioSnapshot,
    note
  }).select().single();
  if(error) throw error;
  return data;
}

async function listSupabaseHistory(){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const {data, error} = await client.from("simulation_history").select("*").order("created_at",{ascending:false});
  if(error) throw error;
  return data || [];
}


async function updateSupabaseScenario(id, patch){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const payload = {
    ...patch,
    updated_at:new Date().toISOString()
  };
  const {data, error} = await client.from("scenarios")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if(error) throw error;
  return data;
}

async function deleteSupabaseScenario(id){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {error} = await client.from("scenarios")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if(error) throw error;
  return true;
}

async function duplicateSupabaseScenario(row, newName){
  return saveSupabaseScenario({
    name:newName || `${row.name || "Escenario"} copia`,
    mode:row.mode || "basic",
    snapshot:row.snapshot,
    visibility:"private"
  });
}

async function listPublicSupabaseScenarios(){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const {data, error} = await client.from("scenarios")
    .select("*")
    .eq("visibility", "public")
    .order("created_at",{ascending:false});
  if(error) throw error;
  return data || [];
}

async function addSupabaseFavorite(scenarioId){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {data, error} = await client.from("scenario_favorites")
    .upsert({user_id:user.id, scenario_id:scenarioId})
    .select()
    .single();
  if(error) throw error;
  return data;
}

async function removeSupabaseFavorite(scenarioId){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {error} = await client.from("scenario_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("scenario_id", scenarioId);
  if(error) throw error;
  return true;
}

async function listFavoriteSupabaseScenarios(){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const {data, error} = await client.from("scenario_favorites")
    .select("scenario_id, created_at, scenarios(*)")
    .order("created_at",{ascending:false});
  if(error) throw error;
  return (data || []).map(row => row.scenarios).filter(Boolean);
}



async function listSupabaseHistoryFiltered(filters={}){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  let query = client.from("simulation_history").select("*").order("created_at",{ascending:false});
  if(filters.winner && filters.winner !== "all") query = query.eq("winner", filters.winner);
  if(filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if(filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  if(filters.limit) query = query.limit(filters.limit);
  const {data, error} = await query;
  if(error) throw error;
  return data || [];
}

async function deleteSupabaseHistory(id){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {error} = await client.from("simulation_history").delete().eq("id", id).eq("user_id", user.id);
  if(error) throw error;
  return true;
}

async function updateSupabaseHistoryNote(id, note){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  const user = await getSupabaseUser();
  if(!user) throw new Error("No hay sesión de Supabase activa.");
  const {data, error} = await client.from("simulation_history").update({note}).eq("id", id).eq("user_id", user.id).select().single();
  if(error) throw error;
  return data;
}


async function makeScenarioPublic(id){
  return updateSupabaseScenario(id, {visibility:"public"});
}

async function importSharedScenarioToCloud({name, mode, snapshot, visibility="private"}){
  return saveSupabaseScenario({name, mode, snapshot, visibility});
}

async function searchPublicSupabaseScenarios(searchText=""){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  let query = client.from("scenarios")
    .select("*")
    .eq("visibility","public")
    .order("created_at",{ascending:false});
  if(searchText){
    query = query.ilike("name", `%${searchText}%`);
  }
  const {data, error} = await query;
  if(error) throw error;
  return data || [];
}


async function listCommunityScenarios({search="", limit=100}={}){
  const client = getSupabaseClient();
  if(!client) throw new Error("Supabase no está configurado.");
  let query = client.from("scenarios")
    .select("*")
    .eq("visibility","public")
    .order("created_at",{ascending:false})
    .limit(limit);
  if(search){
    query = query.ilike("name", `%${search}%`);
  }
  const {data, error} = await query;
  if(error) throw error;
  return data || [];
}


async function getPlayerStatsCloudData(){
  const scenarios = await listSupabaseScenarios();
  const history = listSupabaseHistoryFiltered ? await listSupabaseHistoryFiltered({limit:500}) : await listSupabaseHistory();
  let favorites = [];
  try{ favorites = await listFavoriteSupabaseScenarios(); }catch(error){ favorites = []; }
  return {scenarios, history, favorites};
}

window.BattleLabSupabase = {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  hasSupabaseConfig,
  getSupabaseClient,
  getSupabaseUser,
  signUpWithSupabase,
  signInWithSupabase,
  signOutSupabase,
  upsertSupabaseProfile,
  saveSupabaseScenario,
  listSupabaseScenarios,
  saveSupabaseHistory,
  listSupabaseHistory,
  updateSupabaseScenario,
  deleteSupabaseScenario,
  duplicateSupabaseScenario,
  listPublicSupabaseScenarios,
  addSupabaseFavorite,
  removeSupabaseFavorite,
  listFavoriteSupabaseScenarios,
  listSupabaseHistoryFiltered,
  deleteSupabaseHistory,
  updateSupabaseHistoryNote,
  makeScenarioPublic,
  importSharedScenarioToCloud,
  searchPublicSupabaseScenarios,
  listCommunityScenarios,
  getPlayerStatsCloudData
};
