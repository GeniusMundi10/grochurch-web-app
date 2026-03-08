-- GroChurch Web App Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  church_name TEXT,
  church_size TEXT,
  city TEXT,
  state TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'pastor', 'member', 'donor')),
  service_plan TEXT CHECK (service_plan IN ('donation', 'rescue', 'thrive')),
  avatar_url TEXT,
  bio TEXT,
  years_in_ministry INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service subscriptions table
CREATE TABLE IF NOT EXISTS service_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('donation', 'rescue', 'thrive')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'trial')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  amount DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prayer requests table
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  is_virtual BOOLEAN DEFAULT false,
  meeting_link TEXT,
  max_attendees INTEGER,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'archived')),
  is_broadcast BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources/Content table
CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  resource_type TEXT CHECK (resource_type IN ('article', 'video', 'audio', 'document', 'tool')),
  url TEXT,
  is_premium BOOLEAN DEFAULT false,
  required_plan TEXT CHECK (required_plan IN ('donation', 'rescue', 'thrive')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pastor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type TEXT CHECK (session_type IN ('1on1', 'group', 'crisis', 'followup')),
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Enable insert for authenticated users" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Donations policies
CREATE POLICY "Users can view their own donations" ON donations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all donations" ON donations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON service_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON service_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prayer requests policies
CREATE POLICY "Users can manage their own prayer requests" ON prayer_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all prayer requests" ON prayer_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Events policies
CREATE POLICY "Anyone authenticated can view events" ON events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Event attendees policies
CREATE POLICY "Users can manage their own attendance" ON event_attendees
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendees" ON event_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Messages policies
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR is_broadcast = true);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can manage all messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Resources policies
CREATE POLICY "Authenticated users can view resources" ON resources
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage resources" ON resources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Coaching sessions policies
CREATE POLICY "Users can view their own sessions" ON coaching_sessions
  FOR SELECT USING (auth.uid() = pastor_id OR auth.uid() = coach_id);

CREATE POLICY "Admins can manage all sessions" ON coaching_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_requests_updated_at BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user (update with your actual admin email after setup)
-- INSERT INTO profiles (id, email, full_name, role) VALUES ('YOUR-ADMIN-UUID', 'admin@grochurch.com', 'Dr. Steve', 'admin');
