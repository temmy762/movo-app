const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTierConfig() {
  try {
    const configs = [
      { tier: 'classic', name: 'Movo Classic', image: '/images/movo classic.png', price: 50 },
      { tier: 'premium', name: 'Movo Premium', image: '/images/movo premium.png', price: 80 },
      { tier: 'black', name: 'Movo Privé Black', image: '/images/prive black.png', price: 130 },
    ];

    for (const config of configs) {
      const { data: existing } = await supabase
        .from('VehicleTierConfig')
        .select('*')
        .eq('tier', config.tier)
        .single();

      if (existing) {
        console.log(`✓ Tier config already exists: ${config.tier}`);
        continue;
      }

      const { error } = await supabase
        .from('VehicleTierConfig')
        .insert([config]);

      if (error) {
        console.error(`Error creating ${config.tier}:`, error);
      } else {
        console.log(`✓ Created tier config: ${config.tier}`);
      }
    }

    console.log('✓ Tier configuration seeded successfully');
  } catch (error) {
    console.error('Error seeding tier config:', error);
  }
}

seedTierConfig();
