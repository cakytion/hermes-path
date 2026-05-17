// supabaseClient.js
// วางไฟล์นี้ไว้ใน src/ เดียวกับ App.jsx
// เปลี่ยน SUPABASE_URL และ SUPABASE_ANON_KEY เป็นของตัวเอง
// หาได้ที่: Supabase Dashboard → Project Settings → API

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wwuudbdferndndbqembj.supabase.co';     // ← แก้ตรงนี้
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dXVkYmRmZXJuZG5kYnFlbWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM3MDUsImV4cCI6MjA5NDQ0OTcwNX0.ZZGAq6-16N2tPo1nRnJEvfPpkeevK0Ut2fGXVdfa-r4'; // ← แก้ตรงนี้

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
