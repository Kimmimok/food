// lib/env.ts
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  },
  restaurants: {
    restaurant1: {
      id: process.env.RESTAURANT_1_ID!,
      domain: process.env.RESTAURANT_1_DOMAIN!,
      name: process.env.RESTAURANT_1_NAME!,
    },
    restaurant2: {
      id: process.env.RESTAURANT_2_ID!,
      domain: process.env.RESTAURANT_2_DOMAIN!,
      name: process.env.RESTAURANT_2_NAME!,
    },
  },
}