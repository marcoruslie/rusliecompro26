import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Process from "@/components/Process";
import Products from "@/components/Products";
import Gallery from "@/components/Gallery";
import Capabilities from "@/components/Capabilities";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="hud-root">
      <Navbar />
      <Hero />
      <About />
      <Process />
      <Products />
      <Capabilities />
      <Gallery />
      <Contact />
      <Footer />
    </main>
  );
}
