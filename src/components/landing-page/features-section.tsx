import React, { RefObject } from "react";
import { Card } from "../ui/card";

const FeaturesSection = ({
  featuresRef,
}: {
  featuresRef: RefObject<HTMLDivElement | null>;
}) => {
  return (
    <section id="features" ref={featuresRef} className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Powerful Features for
            <span className="text-gradient"> Modern Agencies</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to de-risk campaigns, extend client engagements,
            and demonstrate proactive value.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Trajectory Simulation",
              description:
                "AI-powered campaign forecasting with performance predictions and scenario modeling.",
              icon: "🔮",
            },
            {
              title: "Competitor Intelligence",
              description:
                "Real-time competitor metrics and market trend analysis to stay ahead.",
              icon: "🕵️",
            },
            {
              title: "Pivot Recommendations",
              description:
                "Smart suggestions for content tweaks, channel shifts, and optimization strategies.",
              icon: "🎯",
            },
            {
              title: "Real-time Dashboard",
              description:
                "Interactive charts showing predicted vs actual metrics with live updates.",
              icon: "📊",
            },
            {
              title: "Client Collaboration",
              description:
                "Transparent client portals with simplified metrics and co-editing capabilities.",
              icon: "👥",
            },
            {
              title: "Performance Alerts",
              description:
                "Proactive notifications for performance dips and optimization opportunities.",
              icon: "🚨",
            },
          ].map((feature, index) => (
            <Card
              key={index}
              className="feature-card glass p-8 hover-lift hover-glow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
