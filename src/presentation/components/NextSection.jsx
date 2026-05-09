import React, { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Box, Typography, Button, Container, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Visibility, LocalCafe, Water, Park, Business, Terrain, Agriculture, Fence } from "@mui/icons-material";
import "./components.css";

import farmImage    from '../../assets/Hassan-Al-Shanteer-Farm.jpg';
import CardSVG      from '../../assets/Card.svg';
import LeafSVG      from '../../assets/Leaf.svg';
import YellowPatterns from '../../assets/YellowPatterns.svg';

const FEATURES = [
  { label: "المنتزهات", link: "/parks",      icon: Park       },
  { label: "السدود",    link: "/dams",       icon: Water      },
  { label: "مقاهي",    link: "/cafes",      icon: LocalCafe  },
  { label: "المزارع",  link: "/farms",      icon: Fence      },
  { label: "المطلات",  link: "/viewpoints", icon: Terrain    },
  { label: "النزل",    link: "/housing",    icon: Business   },
];

export default function BaniHassan() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const sectionRef     = useRef();
  const cardRef        = useRef();
  const descriptionRef = useRef();
  const navigate       = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const isCardInView        = useInView(cardRef,        { once: true, threshold: 0.3 });
  const isDescriptionInView = useInView(descriptionRef, { once: true, threshold: 0.3 });

  return (
    <section ref={sectionRef} id="bani-hassan-section" className="bani-hassan-section">
      <div className="bani-hassan-section-gradient1" />
      <div className="bani-hassan-section-gradient2" />

      <div className="bani-hassan-header">
        <Container maxWidth="xl" className="bani-hassan-header-container">
          <div className={`bani-hassan-text-content ${isVisible ? "visible" : ""}`}>

            <motion.div
              ref={descriptionRef}
              className="bani-hassan-description-box"
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={isDescriptionInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            >
              <Typography variant="body1" className="bani-hassan-description">
                تُعد بني حسن من أجمل محافظات منطقة الباحة، تتميز بطبيعتها الجبلية، ومدرجاتها الخضراء، وأجوائها المعتدلة. تجمع بين التراث الأصيل وجمال الطبيعة، ما يجعلها وجهة مميزة لمحبي الهدوء والاسترخاء.
              </Typography>
            </motion.div>

            <div className="bani-hassan-card-container">
              <motion.img
                ref={cardRef}
                src={CardSVG}
                alt="كرت"
                loading="eager"
                decoding="async"
                className="bani-hassan-card-svg"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={isCardInView
                  ? {
                      opacity: 1,
                      scale: 1,
                      y:       [0, -18, -6, -22, -4, -14, -2, -20, 0],
                      x:       [0,   4,  -3,   6,  -5,   2,  -4,   3, 0],
                      rotate:  [0,   1, -0.8,  1.5, -1,  0.6, -1.2, 0.8, 0],
                    }
                  : { opacity: 0, scale: 0.8, y: 20 }
                }
                transition={isCardInView ? {
                  opacity: { duration: 0.8, ease: "easeOut", delay: 0.2 },
                  scale:   { duration: 0.8, ease: "easeOut", delay: 0.2 },
                  y:       { delay: 1, duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", times: [0, 0.15, 0.3, 0.45, 0.6, 0.7, 0.8, 0.92, 1] },
                  x:       { delay: 1, duration: 9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                  rotate:  { delay: 1, duration: 7, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                } : { duration: 0.8 }}
                whileHover={{ scale: 1.06, rotate: 0, transition: { duration: 0.2 } }}
                style={{ width: "100%", maxWidth: "300px", height: "auto" }}
              />
            </div>

          </div>
        </Container>
      </div>

      <div className="bani-hassan-features-section">
        <Container maxWidth="xl">
          <div className="bani-hassan-features-title-box">
            <img src={YellowPatterns} style={{ width: "100px", height: "auto" }} className="bani-hassan-yellow-patterns" />
            <Typography variant="h3" className="bani-hassan-features-title">وين الوجهة؟</Typography>
          </div>

          <div className={`bani-hassan-feature-row ${isVisible ? "visible" : ""}`}>
            {FEATURES.map(({ label, link, icon: IconComponent }, index) => (
              <motion.div
                key={label}
                className="bani-hassan-feature-grid-item"
                initial={{ y: 100, opacity: 0, scale: 0.8, rotateX: 45 }}
                whileInView={{ y: 0, opacity: 1, scale: 1, rotateX: 0,
                  transition: { type: "spring", stiffness: 50, damping: 20, duration: 1, delay: index * 0.15 }
                }}
                viewport={{ once: true }}
                onClick={() => navigate(link)}
              >
                <img src={LeafSVG} alt="ورقة" loading="eager" decoding="async" className="bani-hassan-leaf-bg" style={{ opacity: 0.7 }} />
                <div className="bani-hassan-feature-content">
                  <IconComponent className="bani-hassan-icon" />
                  <Typography className="bani-hassan-feature-label">{label}</Typography>
                  <div className="bani-hassan-feature-spacer" />
                  <div className="bani-hassan-explore-box">
                    <span className="bani-hassan-explore-text">اكتشف</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
