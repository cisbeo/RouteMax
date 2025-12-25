#!/usr/bin/env tsx

import { config } from 'dotenv';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';

// Load .env.local
config({ path: '.env.local' });

async function testDistanceMatrix() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY_SERVER;

  if (!apiKey) {
    console.error('❌ GOOGLE_MAPS_API_KEY_SERVER not found in environment');
    process.exit(1);
  }

  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...');
  console.log('📍 Testing Distance Matrix API...\n');

  const client = new GoogleMapsClient({});

  try {
    const response = await client.distancematrix({
      params: {
        origins: [
          { lat: 48.8566, lng: 2.3522 }, // Paris
        ],
        destinations: [
          { lat: 48.8606, lng: 2.3376 }, // Louvre
        ],
        mode: 'driving',
        key: apiKey,
      },
      timeout: 10000,
    });

    console.log('✅ Status:', response.data.status);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      console.log('\n✅ Distance Matrix API is working!');
      console.log(`   Distance: ${element.distance?.text}`);
      console.log(`   Duration: ${element.duration?.text}`);
    } else {
      console.error('❌ API returned non-OK status:', response.data.status);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Distance Matrix API call failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.message);
    console.error('   Data:', error.response?.data);

    if (error.response?.status === 403) {
      console.log('\n💡 Possible fixes:');
      console.log('   1. Enable "Distance Matrix API" in Google Cloud Console');
      console.log('   2. Check API key has no restrictions blocking this API');
      console.log('   3. Verify billing is enabled on the project');
    }

    process.exit(1);
  }
}

testDistanceMatrix();
