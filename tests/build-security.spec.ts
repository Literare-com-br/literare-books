import {test,expect} from '@playwright/test';
import {assertPublicBuildEnv} from '../src/lib/build-security';
test('production build refuses privileged frontend credentials without printing them',()=>{
  expect(()=>assertPublicBuildEnv({VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_TURNSTILE_SITE_KEY:'site-key'})).not.toThrow();
  expect(()=>assertPublicBuildEnv({VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_test_private_value'})).toThrow(/Build bloqueado/);
  expect(()=>assertPublicBuildEnv({VITE_SERVICE_ROLE_KEY:'hidden'})).toThrow(/Build bloqueado/);
  const jwt=`e30.${btoa(JSON.stringify({role:'service_role'}))}.signature`;
  expect(()=>assertPublicBuildEnv({VITE_KEY:jwt})).toThrow(/Build bloqueado/);
  expect(()=>assertPublicBuildEnv({VITE_KEY:'  sb_secret_private_value  '})).toThrow(/Build bloqueado/);
  expect(()=>assertPublicBuildEnv({VITE_SUPABASE_URL:'https://user:password@example.com'})).toThrow(/Build bloqueado/);
});
