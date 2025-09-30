import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export class EdgeCaseTests {
  private results: TestResult[] = [];
  
  private log(test: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ test, passed, error, details });
    console.log(`[TEST] ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`, error || '');
  }

  async runAll(): Promise<TestResult[]> {
    this.results = [];
    console.log('🧪 Starting Edge Case Tests...\n');

    await this.testAuthentication();
    await this.testSwipeLimits();
    await this.testDuplicateOperations();
    await this.testDataValidation();
    await this.testRLSPolicies();
    
    console.log('\n📊 Test Summary:');
    console.log(`Total: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.passed).length}`);
    console.log(`Failed: ${this.results.filter(r => !r.passed).length}`);
    
    return this.results;
  }

  private async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');

    // Test 1: Check if unauthenticated user can access protected data
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .limit(1);
      
      this.log(
        'Unauthenticated wallet access blocked',
        error !== null || (data && data.length === 0),
        error?.message
      );
    } catch (e: any) {
      this.log('Unauthenticated wallet access blocked', true);
    }

    // Test 2: Verify current user session
    const { data: { user } } = await supabase.auth.getUser();
    this.log('User session exists', !!user);
  }

  private async testSwipeLimits() {
    console.log('\n👆 Testing Swipe Limits...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      this.log('Swipe limits test', false, 'No authenticated user');
      return;
    }

    // Test 1: Check daily swipe count
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_swipes, subscription_tier, last_swipe_reset')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const maxSwipes = profile.subscription_tier === 'free' ? 20 : 999;
      const swipesLeft = maxSwipes - (profile.daily_swipes || 0);
      
      this.log(
        'Swipe limit tracking functional',
        profile.daily_swipes !== undefined && profile.daily_swipes >= 0,
        undefined,
        { dailySwipes: profile.daily_swipes, maxSwipes, swipesLeft }
      );

      // Test 2: Check if swipe reset date is recent
      const lastReset = new Date(profile.last_swipe_reset);
      const today = new Date();
      const daysSinceReset = Math.floor((today.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
      
      this.log(
        'Swipe reset date valid',
        daysSinceReset >= 0 && daysSinceReset <= 1,
        undefined,
        { lastReset, daysSinceReset }
      );
    }
  }

  private async testDuplicateOperations() {
    console.log('\n🔄 Testing Duplicate Operations...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      this.log('Duplicate operations test', false, 'No authenticated user');
      return;
    }

    // Test 1: Check for duplicate swipes on same target
    const { data: swipes } = await supabase
      .from('swipes')
      .select('target_id, target_type')
      .eq('user_id', user.id);

    if (swipes) {
      const targets = swipes.map(s => `${s.target_type}-${s.target_id}`);
      const uniqueTargets = new Set(targets);
      
      this.log(
        'No duplicate swipes detected',
        targets.length === uniqueTargets.size,
        targets.length !== uniqueTargets.size ? 'Found duplicate swipes' : undefined,
        { totalSwipes: targets.length, uniqueTargets: uniqueTargets.size }
      );
    }

    // Test 2: Check for duplicate wallet records
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id);

    this.log(
      'Single wallet per user',
      wallets ? wallets.length === 1 : false,
      error?.message,
      { walletCount: wallets?.length }
    );
  }

  private async testDataValidation() {
    console.log('\n✅ Testing Data Validation...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      this.log('Data validation test', false, 'No authenticated user');
      return;
    }

    // Test 1: Profile data completeness
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const requiredFields = ['user_id', 'full_name', 'role'];
      const hasRequiredFields = requiredFields.every(field => 
        profile[field as keyof typeof profile] !== null && 
        profile[field as keyof typeof profile] !== ''
      );
      
      this.log(
        'Profile has required fields',
        hasRequiredFields,
        undefined,
        { profile: { ...profile, id: '***' } }
      );

      // Test 2: Valid XP and level values
      this.log(
        'XP and level values valid',
        profile.xp >= 0 && profile.level >= 1,
        undefined,
        { xp: profile.xp, level: profile.level }
      );

      // Test 3: Credits non-negative
      this.log(
        'Credits non-negative',
        profile.credits >= 0,
        undefined,
        { credits: profile.credits }
      );
    }

    // Test 4: Check for orphaned records
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .limit(10);

    if (messages && messages.length > 0) {
      // Verify sender/receiver exist in profiles
      const userIds = [...new Set([
        ...messages.map(m => m.sender_id),
        ...messages.map(m => m.receiver_id)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .in('user_id', userIds);

      const existingIds = new Set(profiles?.map(p => p.user_id) || []);
      const orphaned = userIds.filter(id => !existingIds.has(id));

      this.log(
        'No orphaned message records',
        orphaned.length === 0,
        orphaned.length > 0 ? 'Found orphaned messages' : undefined,
        { orphanedCount: orphaned.length }
      );
    }
  }

  private async testRLSPolicies() {
    console.log('\n🔒 Testing RLS Policies...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      this.log('RLS policies test', false, 'No authenticated user');
      return;
    }

    // Test 1: Can only see own wallet
    const { data: wallets } = await supabase
      .from('wallets')
      .select('user_id')
      .limit(10);

    this.log(
      'Wallet RLS policy enforced',
      wallets ? wallets.every(w => w.user_id === user.id) : true,
      undefined,
      { visibleWallets: wallets?.length }
    );

    // Test 2: Can only see own transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('user_id')
      .limit(10);

    this.log(
      'Transaction RLS policy enforced',
      transactions ? transactions.every(t => t.user_id === user.id) : true,
      undefined,
      { visibleTransactions: transactions?.length }
    );

    // Test 3: Can see all profiles (public data)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(10);

    this.log(
      'Profiles publicly visible',
      !!profiles && profiles.length > 0,
      undefined,
      { visibleProfiles: profiles?.length }
    );

    // Test 4: Can see all active opportunities
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .eq('status', 'active')
      .limit(10);

    this.log(
      'Opportunities publicly visible',
      !!opportunities,
      undefined,
      { visibleOpportunities: opportunities?.length }
    );
  }

  getResults() {
    return this.results;
  }

  getFailedTests() {
    return this.results.filter(r => !r.passed);
  }
}

// Helper function to run tests from console
export const runEdgeCaseTests = async () => {
  const tests = new EdgeCaseTests();
  const results = await tests.runAll();
  
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.error('\n❌ Failed Tests:');
    failed.forEach(f => {
      console.error(`  - ${f.test}`);
      if (f.error) console.error(`    Error: ${f.error}`);
      if (f.details) console.error(`    Details:`, f.details);
    });
  }
  
  return results;
};
