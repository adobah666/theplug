'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { AddressManager } from '@/components/auth/AddressManager';
import { PasswordChangeForm } from '@/components/auth/PasswordChangeForm';
import { useAuthUser } from '@/lib/auth/hooks';

type TabType = 'profile' | 'addresses' | 'password' | 'preferences';

export default function AccountPage() {
  const { user } = useAuthUser();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile Information' },
    { id: 'addresses' as TabType, label: 'Shipping Addresses' },
    { id: 'password' as TabType, label: 'Change Password' },
    { id: 'preferences' as TabType, label: 'Preferences' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <Card className="p-4">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'primary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Card className="p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                  <ProfileForm />
                </div>
              )}

              {activeTab === 'addresses' && <AddressManager />}

              {activeTab === 'password' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Change Password</h2>
                  <div className="max-w-md">
                    <PasswordChangeForm />
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Account Preferences</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-3">Email Notifications</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          Order updates and shipping notifications
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          New product announcements
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Marketing emails and promotions
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">Privacy Settings</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          Allow personalized product recommendations
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Share purchase history for better recommendations
                        </label>
                      </div>
                    </div>

                    <Button className="mt-6">
                      Save Preferences
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}