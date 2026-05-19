import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildApiUrl } from '@/lib/api';

const navItems = [
  { label: 'Home', href: '#hero', type: 'scroll' },
  { label: 'About', href: '#about', type: 'scroll' },
  { label: 'Features', href: '#features', type: 'scroll' },
  { label: 'Get Started', href: '#ecosystem', type: 'scroll' },
  { label: 'Contact Us', href: '#contact-us', type: 'scroll' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      if (token) {
        await fetch(buildApiUrl('/api/accounts/logout/'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      setIsLoggedIn(false);
      navigate('/');
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-border/60">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_12px_35px_-20px_hsl(var(--primary)/0.7)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg sm:text-xl font-semibold tracking-tight">SkillSense AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 ml-auto rounded-full border border-border/60 bg-card/70 px-2 py-1 shadow-[0_16px_50px_-40px_hsl(var(--foreground)/0.4)]">
            {navItems.map((item) => {
              if (item.type === 'scroll') {
                return (
                  <Button
                    key={item.label}
                    variant="ghost"
                    onClick={() => handleNavClick(item.href)}
                    className="px-4 text-xs uppercase tracking-[0.2em]"
                  >
                    {item.label}
                  </Button>
                );
              } else {
                return (
                  <Link key={item.label} to={item.href}>
                    <Button variant="ghost" className="px-4 text-xs uppercase tracking-[0.2em]">
                      {item.label}
                    </Button>
                  </Link>
                );
              }
            })}
            
            {isLoggedIn && (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="px-4 text-xs uppercase tracking-[0.2em] text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden rounded-full border border-border/60 bg-card/70 p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/60">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => {
                if (item.type === 'scroll') {
                  return (
                    <Button
                      key={item.label}
                      variant="ghost"
                      onClick={() => handleNavClick(item.href)}
                      className="w-full justify-start text-xs uppercase tracking-[0.2em]"
                    >
                      {item.label}
                    </Button>
                  );
                } else {
                  return (
                    <Link key={item.label} to={item.href} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-xs uppercase tracking-[0.2em]">
                        {item.label}
                      </Button>
                    </Link>
                  );
                }
              })}
              
              {isLoggedIn && (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-xs uppercase tracking-[0.2em] text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export { Navbar };
