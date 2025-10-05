import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
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
            <Link
              href="/pricing"
              className="hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Support
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          © 2024 PivotPulse. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
