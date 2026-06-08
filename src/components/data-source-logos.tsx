"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useTheme } from "next-themes";
import Image from "next/image";

const logos = [
  {
    name: "USPTO Patents",
    src: "/assets/banner/uspto.png",
    description: "Full-text US patents and applications with claims, descriptions, and figures",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search US patents (USPTO)
response = valyu.search(
    "solid state battery electrolyte patents 2020-2024",
    included_sources=["valyu/valyu-patents"]
    # or leave included_sources empty and we'll figure it out for you
)

# Access the results
for patent in response.results:
    print(f"Patent: {patent.metadata.get('patent_number')}")
    print(f"Title: {patent.title}")
    print(f"Abstract: {patent.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search US patents (USPTO)
const response = await valyu.search({
    query: 'solid state battery electrolyte patents 2020-2024',
    includedSources: ['valyu/valyu-patents'],
    // or leave includedSources empty and we'll figure it out for you
});

// Access the results
response.results.forEach(patent => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "solid state battery electrolyte patents 2020-2024",
    "included_sources": ["valyu/valyu-patents"] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "EPO Patents",
    src: "/assets/banner/epo.jpg",
    description: "European Patent Office grants and applications, full text with figures",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search European patents (EPO)
response = valyu.search(
    "CRISPR gene editing European patents",
    included_sources=["valyu/valyu-patents-epo"]
)

# Access the results
for patent in response.results:
    print(f"Patent: {patent.metadata.get('patent_number')}")
    print(f"Kind code: {patent.metadata.get('kind_code')}")
    print(f"Title: {patent.title}")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search European patents (EPO)
const response = await valyu.search({
    query: 'CRISPR gene editing European patents',
    includedSources: ['valyu/valyu-patents-epo'],
});

// Access the results
response.results.forEach(patent => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "CRISPR gene editing European patents",
    "included_sources": ["valyu/valyu-patents-epo"]
  }'`,
      },
    ],
  },
  {
    name: "Scientific Prior Art",
    src: "/arxiv.svg",
    description: "Non-patent literature (arXiv preprints) for prior-art and novelty searches",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Find non-patent prior art (scientific literature)
response = valyu.search(
    "transformer attention mechanism prior art before 2017",
    included_sources=["valyu/valyu-arxiv"]
)

# Access the results
for paper in response.results:
    print(f"Title: {paper.title}")
    print(f"Authors: {paper.metadata.get('authors', [])}")
    print(f"Abstract: {paper.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Find non-patent prior art (scientific literature)
const response = await valyu.search({
    query: 'transformer attention mechanism prior art before 2017',
    includedSources: ['valyu/valyu-arxiv'],
});

// Access the results
response.results.forEach(paper => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "transformer attention mechanism prior art before 2017",
    "included_sources": ["valyu/valyu-arxiv"]
  }'`,
      },
    ],
  },
  {
    name: "Web Search",
    src: "/web.svg",
    description: "General web search for products, companies, and technical background",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search across the web (e.g. accused products for FTO)
response = valyu.search(
    "competitor solid-state battery product specifications 2024"
)

# Get ranked results
for result in response.results:
    print(f"Title: {result.title}")
    print(f"URL: {result.metadata.get('url')}")
    print(f"Content: {result.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search across the web (e.g. accused products for FTO)
const response = await valyu.search({
    query: 'competitor solid-state battery product specifications 2024'
});

// Get ranked results
response.results.forEach(result => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "competitor solid-state battery product specifications 2024"
  }'`,
      },
    ],
  },
];

const DataSourceLogos = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const controls = useAnimation();
  const animationRef = useRef<any>(null);
  const currentPositionRef = useRef(0);
  const animationStartTimeRef = useRef(0);

  // Patent offices + non-patent-literature sources
  const allLogos = [
    { name: "USPTO", src: "/assets/banner/uspto.png" },
    { name: "EPO", src: "/assets/banner/epo.jpg" },
    { name: "arXiv", src: "/assets/banner/arxiv.png" },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...allLogos, ...allLogos, ...allLogos];

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Start continuous animation
  useEffect(() => {
    const animate = async () => {
      currentPositionRef.current = 0;
      animationStartTimeRef.current = Date.now();

      await controls.start({
        x: [0, -100 * allLogos.length],
        transition: {
          // ↓↓↓ Decrease duration by 1.5x for 1.5x speed ↑↑↑
          duration: (allLogos.length * 3) / 1.5,
          ease: "linear",
          repeat: Infinity,
        }
      });
    };

    animate();
  }, [controls, allLogos.length]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);

    // Calculate current position based on elapsed time
    const elapsedTime = Date.now() - animationStartTimeRef.current;
    const totalDuration = ((allLogos.length * 3) / 1.5) * 1000; // Convert to ms
    const progress = (elapsedTime % totalDuration) / totalDuration;
    currentPositionRef.current = -100 * allLogos.length * progress;

    controls.stop();
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);

    // Get current position from ref
    const currentX = currentPositionRef.current;
    const targetX = -100 * allLogos.length;
    const remainingDistance = Math.abs(targetX - currentX);
    const totalDistance = 100 * allLogos.length;

    // Calculate remaining duration to maintain constant speed
    const totalDuration = (allLogos.length * 3) / 1.5;
    const remainingDuration = (remainingDistance / totalDistance) * totalDuration;

    // Update animation start time for next cycle
    animationStartTimeRef.current = Date.now();

    // Resume from current position with calculated duration
    controls.start({
      x: targetX,
      transition: {
        duration: remainingDuration,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      }
    });
  };

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className="relative w-full overflow-hidden py-4">
      <motion.div
        className="flex gap-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <motion.div
          className="flex gap-12 flex-shrink-0"
          animate={controls}
        >
          {duplicatedLogos.map((logo, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <motion.div
                key={`${logo.name}-${index}`}
                className="relative flex-shrink-0"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                animate={{
                  scale: isHovered ? 1.3 : 1,
                }}
                transition={{
                  scale: { duration: 0.3 }
                }}
              >
                <div className="relative w-16 h-16">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    fill
                    className="object-contain transition-all duration-500"
                    style={{
                      filter: isHovered
                        ? 'grayscale(0%)'
                        : isDark
                          ? 'grayscale(100%) opacity(0.3) brightness(2)'
                          : 'grayscale(100%) opacity(0.3)',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Gradient edges for infinite scroll effect */}
      <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};

export default DataSourceLogos;