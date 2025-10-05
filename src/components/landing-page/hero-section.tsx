import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";

const HeroSection = () => {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="hero-title text-5xl md:text-7xl font-bold mb-6">
            AI-Powered
            <span className="text-gradient block">Campaign Intelligence</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Simulate campaign trajectories, predict performance dips, and get
            AI-driven pivot recommendations for your PR and content campaigns.
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
            { icon: "⚡", label: "Real-time" },
          ].map((item, index) => (
            <div key={index} className="floating-icon text-center">
              <div className="w-16 h-16 mx-auto mb-2 glass rounded-xl flex items-center justify-center text-2xl hover-glow transition-all duration-300">
                {item.icon}
              </div>
              <span className="text-sm text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
