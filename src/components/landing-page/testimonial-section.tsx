import React, { RefObject } from "react";
import { Card } from "../ui/card";

const TestimonialSection = ({
  testimonialsRef,
}: {
  testimonialsRef: RefObject<HTMLDivElement | null>;
}) => {
  return (
    <section
      id="testimonials"
      ref={testimonialsRef}
      className="py-20 px-6 bg-surface/30"
    >
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
              content:
                "PivotPulse transformed how we approach campaign planning. The AI predictions helped us avoid three major performance dips last quarter.",
              avatar: "👩‍💼",
            },
            {
              name: "Marcus Rodriguez",
              role: "Senior Strategist at BrandFlow",
              content:
                "The competitor intelligence feature is game-changing. We can now proactively adjust campaigns based on market movements.",
              avatar: "👨‍💻",
            },
            {
              name: "Emma Thompson",
              role: "Founder of Digital Dynamics",
              content:
                "Our clients love the transparency. The pivot recommendations have increased our campaign success rate by 40%.",
              avatar: "👩‍🚀",
            },
          ].map((testimonial, index) => (
            <Card key={index} className="testimonial-card glass p-8">
              <p className="text-muted-foreground mb-6 italic">
                "{testimonial.content}"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-2xl mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
