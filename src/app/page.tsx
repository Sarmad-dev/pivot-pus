"use client"
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const LandingPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.fromTo(
        '.hero-title',
        { opacity: 0, y: 50, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.hero-subtitle',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power2.out' }
      );

      gsap.fromTo(
        '.hero-buttons',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, delay: 0.6, ease: 'power2.out' }
      );

      // Floating animation for hero icons
      gsap.to('.floating-icon', {
        y: -15,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
        stagger: 0.3
      });

      // Features section
      gsap.fromTo(
        '.feature-card',
        { opacity: 0, y: 50, rotateX: 15 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.2,
          scrollTrigger: {
            trigger: featuresRef.current,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // Testimonials
      gsap.fromTo(
        '.testimonial-card',
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'power2.out',
          stagger: 0.3,
          scrollTrigger: {
            trigger: testimonialsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // CTA section
      gsap.fromTo(
        '.cta-content',
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-strong border-b border-border/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gradient">PivotPulse</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link>
              <Link href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">Testimonials</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
              <Link href="/auth/sign-in">
                <Button variant="outline" size="sm" className="btn-ghost">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="hero-title text-5xl md:text-7xl font-bold mb-6">
              AI-Powered
              <span className="text-gradient block">Campaign Intelligence</span>
            </h1>
            <p className="hero-subtitle text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Simulate campaign trajectories, predict performance dips, and get AI-driven pivot recommendations for your PR and content campaigns.
            </p>
            <div className="hero-buttons flex flex-col md:flex-row gap-4 justify-center items-center">
              <Link href="/signin">
                <Button size="lg" className="btn-hero">
                  Start Free Trial
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="btn-ghost">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Floating Icons */}
          <div className="mt-16 grid grid-cols-3 md:grid-cols-5 gap-8 max-w-2xl mx-auto">
            {[
              { icon: "📊", label: "Analytics" },
              { icon: "🤖", label: "AI Insights" },
              { icon: "🎯", label: "Targeting" },
              { icon: "📈", label: "Growth" },
              { icon: "⚡", label: "Real-time" }
            ].map((item, index) => (
              <div key={index} className="floating-icon text-center">
                <div className="w-16 h-16 mx-auto mb-2 glass rounded-xl flex items-center justify-center text-2xl hover-glow transition-all duration-300">
                  {item.icon}
                </div>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Powerful Features for 
              <span className="text-gradient"> Modern Agencies</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to de-risk campaigns, extend client engagements, and demonstrate proactive value.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Trajectory Simulation",
                description: "AI-powered campaign forecasting with performance predictions and scenario modeling.",
                icon: "🔮"
              },
              {
                title: "Competitor Intelligence",
                description: "Real-time competitor metrics and market trend analysis to stay ahead.",
                icon: "🕵️"
              },
              {
                title: "Pivot Recommendations",
                description: "Smart suggestions for content tweaks, channel shifts, and optimization strategies.",
                icon: "🎯"
              },
              {
                title: "Real-time Dashboard",
                description: "Interactive charts showing predicted vs actual metrics with live updates.",
                icon: "📊"
              },
              {
                title: "Client Collaboration",
                description: "Transparent client portals with simplified metrics and co-editing capabilities.",
                icon: "👥"
              },
              {
                title: "Performance Alerts",
                description: "Proactive notifications for performance dips and optimization opportunities.",
                icon: "🚨"
              }
            ].map((feature, index) => (
              <Card key={index} className="feature-card glass p-8 hover-lift hover-glow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" ref={testimonialsRef} className="py-20 px-6 bg-surface/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Leading
              <span className="text-gradient"> Agencies</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Agency Director at CreativePulse",
                content: "PivotPulse transformed how we approach campaign planning. The AI predictions helped us avoid three major performance dips last quarter.",
                avatar: "👩‍💼"
              },
              {
                name: "Marcus Rodriguez",
                role: "Senior Strategist at BrandFlow",
                content: "The competitor intelligence feature is game-changing. We can now proactively adjust campaigns based on market movements.",
                avatar: "👨‍💻"
              },
              {
                name: "Emma Thompson",
                role: "Founder of Digital Dynamics",
                content: "Our clients love the transparency. The pivot recommendations have increased our campaign success rate by 40%.",
                avatar: "👩‍🚀"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="testimonial-card glass p-8">
                <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-2xl mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="cta-content max-w-3xl mx-auto glass-strong p-12 rounded-3xl glow-subtle">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your
              <span className="text-gradient"> Campaign Strategy?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join hundreds of agencies already using AI to predict, pivot, and perform better.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Link href="/signin">
                <Button size="lg" className="btn-hero">
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="btn-ghost">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gradient">PivotPulse</span>
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="#" className="hover:text-primary transition-colors">Support</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
            © 2024 PivotPulse. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;