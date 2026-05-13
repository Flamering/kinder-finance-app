import { supabase } from './supabase';

export async function fetchSectionData(section) {
  const { data, error } = await supabase
    .from(section)
    .select('*')
    .eq('eliminado', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRecord(section, data) {
  const sectionDefaults = {
    finanzas: { tipo: 'Ingreso', estado: 'Completado' },
    alumnos: { estado: 'Activo' },
    cxc: { estado: 'Pendiente' },
  };
  const enrichedData = { ...(sectionDefaults[section] || {}), ...data, eliminado: false };
  const { data: result, error } = await supabase
    .from(section)
    .insert([enrichedData])
    .select();
  if (error) throw error;
  return result[0];
}

export async function updateRecord(section, id, data) {
  const { data: result, error } = await supabase
    .from(section)
    .update(data)
    .eq('id', id)
    .select();
  if (error) throw error;
  return result[0];
}

export async function softDeleteRecord(section, id) {
  const { error } = await supabase
    .from(section)
    .update({ eliminado: true })
    .eq('id', id);
  if (error) throw error;
}
