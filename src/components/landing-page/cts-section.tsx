import Link from "next/link";
import React, { RefObject } from "react";
import { Button } from "../ui/button";

const CTASection = ({
  ctaRef,
}: {
  ctaRef: RefObject<HTMLDivElement | null>;
}) => {
  return (
    <section ref={ctaRef} className="py-20 px-6">
      <div className="container mx-auto text-center">
        <div className="cta-content max-w-3xl mx-auto glass-strong p-12 rounded-3xl glow-subtle">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your
            <span className="text-gradient"> Campaign Strategy?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of agencies already using AI to predict, pivot, and
            perform better.
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
  );
};

export default CTASection;
