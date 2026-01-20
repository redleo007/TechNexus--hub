import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testNoShows() {
  console.log('Testing no-shows query...\n');
  
  // Test 1: Get all attendance records
  const { data: allAttendance, error: error1 } = await supabase
    .from('attendance')
    .select('id, status')
    .limit(10);
    
  console.log('All attendance (first 10):');
  console.log(allAttendance);
  console.log('Error:', error1);
  console.log('\n');
  
  // Test 2: Get no-shows with OR query
  const { data: noShows, error: error2 } = await supabase
    .from('attendance')
    .select('id, status')
    .or('status.eq.no_show,status.eq.not_attended,status.is.null');
    
  console.log('No-shows with OR query:');
  console.log(noShows);
  console.log('Error:', error2);
  console.log('Count:', noShows?.length);
  console.log('\n');
  
  // Test 3: Get attendance stats
  const { data: attended } = await supabase
    .from('attendance')
    .select('id')
    .eq('status', 'attended');
    
  const { data: allNoShows } = await supabase
    .from('attendance')
    .select('id')
    .or('status.eq.no_show,status.eq.not_attended,status.is.null');
    
  console.log('Stats:');
  console.log('Attended:', attended?.length || 0);
  console.log('No-shows:', allNoShows?.length || 0);
}

testNoShows().then(() => process.exit(0));
