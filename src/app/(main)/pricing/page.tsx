"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Basic",
      description: "Perfect for small agencies getting started",
      monthlyPrice: 99,
      annualPrice: 79,
      features: [
        "Up to 5 active campaigns",
        "Basic AI insights and predictions",
        "Standard dashboard and reporting",
        "Email support",
        "1 team member",
        "Campaign performance tracking",
        "Basic competitor monitoring",
      ],
      limitations: [
        "Limited to 5 campaigns",
        "Basic support only",
        "No advanced integrations",
      ],
      popular: false,
      cta: "Start Free Trial",
    },
    {
      name: "Pro",
      description: "Most popular for growing agencies",
      monthlyPrice: 299,
      annualPrice: 239,
      features: [
        "Unlimited campaigns",
        "Advanced AI predictions and pivot recommendations",
        "Real-time collaboration tools",
        "Priority support with dedicated success manager",
        "Up to 10 team members",
        "Advanced analytics and custom reports",
        "Full competitor intelligence suite",
        "API access for custom integrations",
        "White-label client portals",
        "Advanced workflow automation",
      ],
      limitations: [],
      popular: true,
      cta: "Start Pro Trial",
    },
    {
      name: "Enterprise",
      description: "For large agencies with custom needs",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      features: [
        "Everything in Pro",
        "Custom AI model training",
        "Dedicated infrastructure",
        "Advanced security and compliance",
        "Unlimited team members",
        "Custom integrations and APIs",
        "Dedicated account manager",
        "SLA guarantees",
        "On-premise deployment options",
        "Advanced audit and reporting",
        "Priority feature requests",
        "24/7 phone support",
      ],
      limitations: [],
      popular: false,
      cta: "Contact Sales",
    },
  ];

  const faqs = [
    {
      question: "What is PivotPulse and how does it work?",
      answer:
        "PivotPulse is an AI-powered campaign intelligence platform that helps PR and content agencies simulate campaign trajectories, predict performance, and get smart pivot recommendations. Our AI analyzes your campaigns in real-time and provides actionable insights to optimize performance.",
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer:
        "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. If you cancel, you'll continue to have access to your plan features until the end of your current billing cycle.",
    },
    {
      question: "Do you offer a free trial?",
      answer:
        "Yes! We offer a 14-day free trial for both Basic and Pro plans. No credit card required to start your trial. You can explore all features and see how PivotPulse can transform your campaign management.",
    },
    {
      question: "What kind of support do you provide?",
      answer:
        "Basic plans include email support with 24-48 hour response times. Pro plans get priority support with dedicated success managers and faster response times. Enterprise customers receive 24/7 phone support and dedicated account management.",
    },
    {
      question: "Can I integrate PivotPulse with my existing tools?",
      answer:
        "Yes! Pro and Enterprise plans include API access for custom integrations. We also have pre-built integrations with popular platforms like Google Ads, Facebook Ads, Slack, and major CRM systems.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. We use enterprise-grade security measures including encryption at rest and in transit, regular security audits, and compliance with SOC 2 Type II standards. Enterprise plans offer additional security features and compliance options.",
    },
  ];

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navigation */}
      <nav className="border-b border-border/30 glass-strong">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gradient">
                PivotPulse
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link href="/auth/sign-in">
                <Button variant="outline" className="btn-ghost">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Choose Your
              <span className="text-gradient block">Intelligence Level</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Transparent pricing for agencies of all sizes. Start with our free
              trial and scale as you grow.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4">
              <Label
                htmlFor="billing-toggle"
                className={`${
                  !isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label
                htmlFor="billing-toggle"
                className={`${
                  isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Annual
              </Label>
              <Badge
                variant="secondary"
                className="bg-success/20 text-success ml-2"
              >
                Save 20%
              </Badge>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`glass hover-lift relative ${
                  plan.popular ? "border-primary/50 glow-subtle" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <Badge className="bg-primary text-primary-foreground px-6 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {plan.description}
                  </CardDescription>

                  <div className="mt-6">
                    {typeof plan.monthlyPrice === "number" ? (
                      <div>
                        <div className="text-5xl font-bold text-foreground">
                          ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                        </div>
                        <div className="text-muted-foreground">
                          per month{" "}
                          {isAnnual && (
                            <span className="text-success">
                              (billed annually)
                            </span>
                          )}
                        </div>
                        {isAnnual && typeof plan.annualPrice === "number" && (
                          <div className="text-sm text-muted-foreground mt-1">
                            <span className="line-through">
                              ${plan.monthlyPrice}/mo
                            </span>
                            <span className="text-success ml-1">
                              Save $
                              {(plan.monthlyPrice - plan.annualPrice) * 12}/year
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-5xl font-bold text-foreground">
                          {plan.monthlyPrice}
                        </div>
                        <div className="text-muted-foreground">
                          Contact for pricing
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-success text-xs">✓</span>
                        </div>
                        <span className="text-sm text-foreground">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link href="/auth/sign-in" className="block">
                    <Button
                      className={`w-full ${
                        plan.popular ? "btn-hero" : "btn-ghost"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  {plan.limitations.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium mb-1">Limitations:</div>
                      {plan.limitations.map((limitation, idx) => (
                        <div key={idx}>• {limitation}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enterprise CTA */}
          <div className="text-center mb-20">
            <Card className="glass-strong p-12 max-w-4xl mx-auto">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Need Something Custom?
                </h2>
                <p className="text-xl text-muted-foreground mb-6">
                  Enterprise solutions with custom AI training, dedicated
                  infrastructure, and white-glove support.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <Link href="/auth/sign-in">
                    <Button className="btn-hero">Schedule Demo</Button>
                  </Link>
                  <Button variant="outline" className="btn-ghost">
                    Contact Sales
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-muted-foreground">
                Everything you need to know about PivotPulse pricing and
                features.
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="glass">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center mt-20">
            <Card className="glass p-8 max-w-2xl mx-auto">
              <CardContent className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to Transform Your Campaign Strategy?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Join hundreds of agencies already using AI to predict, pivot,
                  and perform better.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <Link href="/auth/sign-in">
                    <Button className="btn-hero">Start Free Trial</Button>
                  </Link>
                  <Button variant="outline" className="btn-ghost">
                    See Demo
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  No credit card required • 14-day free trial • Cancel anytime
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
