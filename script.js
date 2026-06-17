// Enhanced Carousel Functionality
class ModernCarousel {
    constructor() {
        this.carousels = document.querySelectorAll('.carousel-track');
        this.init();
    }

    init() {
        this.carousels.forEach(carousel => {
            if (carousel.classList.contains('products-carousel')) {
                this.setupProductsCarousel(carousel);
            } else {
                this.setupTestimonialsCarousel(carousel);
            }
        });

        this.setupIntersectionObserver();
        this.setupResizeHandler();
    }

    getProductsDuration() {
        const w = window.innerWidth;
        if (w < 768) return 45000;
        if (w < 1024) return 55000;
        return 70000;
    }

    setupProductsCarousel(carousel) {
        const originalCards = [...carousel.querySelectorAll('.product-card')];
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.classList.add('product-card-clone');
            carousel.appendChild(clone);
        });

        const container = carousel.closest('.carousel-container');
        let scrollWrap = container.querySelector('.carousel-scroll');
        if (!scrollWrap) {
            scrollWrap = document.createElement('div');
            scrollWrap.className = 'carousel-scroll products-carousel-scroll';
            container.insertBefore(scrollWrap, container.firstChild);
            scrollWrap.appendChild(carousel);
        } else {
            scrollWrap.classList.add('products-carousel-scroll');
            if (carousel.parentElement !== scrollWrap) {
                scrollWrap.appendChild(carousel);
            }
        }

        carousel.style.animation = 'none';
        carousel.style.transform = '';

        const state = {
            autoScrollActive: true,
            isVisible: true,
            isLooping: false,
            isAutoScrolling: false,
            pxPerMs: 0,
            halfWidth: 0,
            resumeTimeout: null,
            lastTime: 0,
            rafId: null,
            pointerMoved: false,
            pointerStartX: 0,
            pointerStartY: 0
        };
        carousel._scrollState = state;
        carousel._visibilityTarget = scrollWrap;

        const measure = () => {
            state.halfWidth = carousel.scrollWidth / 2;
            state.pxPerMs = state.halfWidth > 0 ? state.halfWidth / this.getProductsDuration() : 0;
        };

        const loopScroll = () => {
            if (state.isLooping || state.halfWidth <= 0) return;
            const sl = scrollWrap.scrollLeft;
            if (sl >= state.halfWidth - 1) {
                state.isLooping = true;
                scrollWrap.scrollLeft = sl - state.halfWidth;
                state.isLooping = false;
            } else if (sl <= 0) {
                state.isLooping = true;
                scrollWrap.scrollLeft = sl + state.halfWidth;
                state.isLooping = false;
            }
        };

        const pauseAuto = () => {
            state.autoScrollActive = false;
            clearTimeout(state.resumeTimeout);
        };

        const scheduleResume = (delay = 800) => {
            if (carousel.dataset.userStopped === 'true') return;
            clearTimeout(state.resumeTimeout);
            state.resumeTimeout = setTimeout(() => {
                state.autoScrollActive = true;
                state.lastTime = performance.now();
            }, delay);
        };

        const resumeAuto = () => {
            state.autoScrollActive = true;
            state.lastTime = performance.now();
            clearTimeout(state.resumeTimeout);
        };

        const endAutoScroll = () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    state.isAutoScrolling = false;
                });
            });
        };

        const tick = (now) => {
            if (!state.lastTime) state.lastTime = now;
            const delta = now - state.lastTime;
            state.lastTime = now;

            if (state.autoScrollActive && state.isVisible &&
                carousel.dataset.userStopped !== 'true' && state.halfWidth > 0) {
                state.isAutoScrolling = true;
                scrollWrap.scrollLeft += state.pxPerMs * delta;
                loopScroll();
                endAutoScroll();
            }

            state.rafId = requestAnimationFrame(tick);
        };

        carousel._remeasure = measure;

        requestAnimationFrame(() => {
            measure();
            scrollWrap.scrollLeft = 0;
            state.lastTime = performance.now();
            state.rafId = requestAnimationFrame(tick);
        });

        scrollWrap.addEventListener('scroll', () => {
            loopScroll();
        }, { passive: true });

        scrollWrap.addEventListener('wheel', (e) => {
            const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
            if (isHorizontal) {
                pauseAuto();
                scheduleResume(1000);
            }
        }, { passive: true });

        let touchStartX = 0;
        let touchStartY = 0;
        let touchIsHorizontal = false;

        scrollWrap.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchIsHorizontal = false;
        }, { passive: true });

        scrollWrap.addEventListener('touchmove', (e) => {
            if (!touchStartX) return;
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 10 && dx > dy * 1.2) {
                if (!touchIsHorizontal) pauseAuto();
                touchIsHorizontal = true;
            }
        }, { passive: true });

        scrollWrap.addEventListener('touchend', () => {
            if (touchIsHorizontal) scheduleResume(800);
            touchStartX = 0;
            touchStartY = 0;
            touchIsHorizontal = false;
        }, { passive: true });

        scrollWrap.addEventListener('pointerdown', (e) => {
            state.pointerStartX = e.clientX;
            state.pointerStartY = e.clientY;
            state.pointerMoved = false;
        });

        scrollWrap.addEventListener('pointermove', (e) => {
            if (state.pointerMoved) return;
            const dx = Math.abs(e.clientX - state.pointerStartX);
            const dy = Math.abs(e.clientY - (state.pointerStartY || e.clientY));
            if (dx > 10 && dx > dy * 1.2) {
                state.pointerMoved = true;
                pauseAuto();
            }
        }, { passive: true });

        scrollWrap.addEventListener('pointerup', () => {
            if (state.pointerMoved) scheduleResume(600);
            state.pointerMoved = false;
        });

        carousel.addEventListener('click', (e) => {
            if (state.pointerMoved) return;

            const card = e.target.closest('.product-card');
            if (!card) return;

            if (card.classList.contains('is-selected')) {
                carousel.querySelectorAll('.product-card').forEach(c => c.classList.remove('is-selected'));
                carousel.classList.remove('is-paused', 'user-stopped');
                carousel.dataset.userStopped = 'false';
                resumeAuto();
                return;
            }

            carousel.querySelectorAll('.product-card').forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
            carousel.classList.add('is-paused', 'user-stopped');
            carousel.dataset.userStopped = 'true';
            pauseAuto();
        });
    }

    setProductsSpeed(carousel) {
        if (carousel._remeasure) carousel._remeasure();
    }

    setupTestimonialsCarousel(carousel) {
        const cards = carousel.querySelectorAll('.testimonial-card');

        cards.forEach(card => {
            const clone = card.cloneNode(true);
            carousel.appendChild(clone);
        });

        carousel.addEventListener('mouseenter', () => {
            carousel.style.animationPlayState = 'paused';
        });

        carousel.addEventListener('mouseleave', () => {
            if (carousel.dataset.userStopped !== 'true') {
                carousel.style.animationPlayState = 'running';
            }
        });

        const container = carousel.closest('.carousel-container');
        let scrollWrap = container.querySelector('.carousel-scroll');
        if (!scrollWrap) {
            scrollWrap = document.createElement('div');
            scrollWrap.className = 'carousel-scroll';
            container.insertBefore(scrollWrap, container.firstChild);
            scrollWrap.appendChild(carousel);
        } else if (carousel.parentElement !== scrollWrap) {
            scrollWrap.appendChild(carousel);
        }

        this.addTouchSupport(carousel, scrollWrap);
        this.setupScrollControls(carousel, scrollWrap, container, false);
    }

    setupScrollControls(carousel, scrollWrap, container, isProductsCarousel) {
        if (isProductsCarousel) return;

        let resumeTimeout;

        const setInteracting = (isInteracting) => {
            carousel.dataset.userInteracting = isInteracting ? 'true' : 'false';
        };

        const pause = () => {
            clearTimeout(resumeTimeout);
            setInteracting(true);
            carousel.classList.add('is-paused');
            carousel.style.animationPlayState = 'paused';
        };

        const scheduleResume = (delay = 400) => {
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(() => {
                setInteracting(false);
                carousel.classList.remove('is-paused');
                carousel.style.animationPlayState = 'running';
            }, delay);
        };

        const loopScrollIfNeeded = () => {
            const contentWidth = carousel.scrollWidth;
            const halfWidth = contentWidth / 2;
            const maxLeft = contentWidth - scrollWrap.clientWidth;
            const sl = scrollWrap.scrollLeft;
            const epsilon = Math.max(halfWidth * 0.05, 16);
            if (sl <= epsilon) {
                scrollWrap.scrollTo({ left: sl + halfWidth, behavior: 'smooth' });
            } else if (sl >= maxLeft - epsilon) {
                scrollWrap.scrollTo({ left: sl - halfWidth, behavior: 'smooth' });
            }
        };

        requestAnimationFrame(() => {
            const halfWidth = carousel.scrollWidth / 2;
            if (halfWidth > 0) {
                scrollWrap.scrollLeft = halfWidth;
            }
        });

        scrollWrap.addEventListener('scroll', () => {
            pause();
            loopScrollIfNeeded();
            scheduleResume(500);
        }, { passive: true });

        scrollWrap.addEventListener('touchmove', () => {
            pause();
            loopScrollIfNeeded();
        }, { passive: true });

        scrollWrap.addEventListener('touchstart', () => pause(), { passive: true });
        scrollWrap.addEventListener('touchend', () => scheduleResume(600), { passive: true });
        scrollWrap.addEventListener('pointerdown', () => pause());
        scrollWrap.addEventListener('pointerup', () => scheduleResume(400));

        scrollWrap.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                pause();
                loopScrollIfNeeded();
                scheduleResume(600);
            }
        }, { passive: true });

        const existingLeft = container.querySelector('.carousel-btn.left');
        const existingRight = container.querySelector('.carousel-btn.right');
        if (!existingLeft && !existingRight) {
            const leftBtn = document.createElement('button');
            leftBtn.className = 'carousel-btn left';
            leftBtn.setAttribute('aria-label', 'Scroll left');
            leftBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

            const rightBtn = document.createElement('button');
            rightBtn.className = 'carousel-btn right';
            rightBtn.setAttribute('aria-label', 'Scroll right');
            rightBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

            container.appendChild(leftBtn);
            container.appendChild(rightBtn);

            const scrollAmount = 380;
            let holdInterval;

            const startHoldScroll = (direction) => {
                pause();
                clearInterval(holdInterval);
                holdInterval = setInterval(() => {
                    scrollWrap.scrollBy({ left: direction * 20, behavior: 'smooth' });
                    loopScrollIfNeeded();
                }, 16);
            };

            const stopHoldScroll = () => {
                clearInterval(holdInterval);
                scheduleResume(250);
            };

            leftBtn.addEventListener('click', () => {
                pause();
                scrollWrap.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                loopScrollIfNeeded();
                scheduleResume(350);
            });

            rightBtn.addEventListener('click', () => {
                pause();
                scrollWrap.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                loopScrollIfNeeded();
                scheduleResume(350);
            });

            leftBtn.addEventListener('pointerdown', () => startHoldScroll(-1));
            rightBtn.addEventListener('pointerdown', () => startHoldScroll(1));
            ['pointerup', 'pointerleave'].forEach(evt => {
                leftBtn.addEventListener(evt, stopHoldScroll);
                rightBtn.addEventListener(evt, stopHoldScroll);
            });
        }
    }

    addTouchSupport(carousel, scrollWrap) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        const target = scrollWrap || carousel;

        target.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            carousel.style.animationPlayState = 'paused';
        }, { passive: true });

        target.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            // Add subtle resistance effect
            carousel.style.transform = `translateX(${deltaX * 0.5}px)`;
        }, { passive: true });

        target.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            isDragging = false;
            carousel.style.transform = '';
            // Resume is handled externally by scroll/touch end handlers
        }, { passive: true });
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const target = entry.target;
                const carousel = target.classList.contains('products-carousel')
                    ? target
                    : target.closest('.carousel-track') || target.querySelector?.('.products-carousel');

                if (carousel?.classList.contains('products-carousel') && carousel._scrollState) {
                    carousel._scrollState.isVisible = entry.isIntersecting;
                    if (entry.isIntersecting && carousel._remeasure) {
                        carousel._remeasure();
                    }
                    return;
                }

                const track = target.classList.contains('carousel-track')
                    ? target
                    : target.closest('.carousel-track');
                if (!track) return;

                const userStopped = track.dataset.userStopped === 'true';
                if (entry.isIntersecting) {
                    if (!userStopped) {
                        track.style.animationPlayState = 'running';
                    }
                } else {
                    track.style.animationPlayState = 'paused';
                }
            });
        }, { threshold: 0.1 });

        this.carousels.forEach(carousel => {
            const target = carousel._visibilityTarget || carousel;
            observer.observe(target);
        });
    }

    setupResizeHandler() {
        let resizeTimeout;

        const handleViewportChange = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.carousels.forEach(carousel => {
                    if (carousel.classList.contains('products-carousel')) {
                        this.setProductsSpeed(carousel);
                    } else {
                        this.adjustTestimonialSpeed(carousel);
                    }
                });
            }, 250);
        };

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', handleViewportChange);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        }
    }

    adjustTestimonialSpeed(carousel) {
        const screenWidth = window.innerWidth;
        if (screenWidth < 768) {
            carousel.style.animationDuration = '50s';
        } else if (screenWidth < 1024) {
            carousel.style.animationDuration = '65s';
        } else {
            carousel.style.animationDuration = '80s';
        }
    }

    adjustCarouselSpeeds() {
        this.carousels.forEach(carousel => {
            if (carousel.classList.contains('products-carousel')) {
                this.setProductsSpeed(carousel);
            } else {
                this.adjustTestimonialSpeed(carousel);
            }
        });
    }
}

// Smooth Scroll Enhancement for Carousel Cards
class SmoothScrollEnhancer {
    constructor() {
        this.init();
    }

    init() {
        // Add smooth momentum scrolling for better UX on inner scroll wrapper
        document.querySelectorAll('.carousel-scroll').forEach(scroller => {
            this.addMomentumScrolling(scroller);
        });
    }

    addMomentumScrolling(element) {
        element.style.webkitOverflowScrolling = 'touch';
        if (!element.classList.contains('products-carousel-scroll')) {
            element.style.scrollBehavior = 'smooth';
        }
    }
}

// Performance Monitor for Carousel Animations
class CarouselPerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.init();
    }

    init() {
        // Monitor FPS and adjust quality if needed
        this.monitorPerformance();
    }

    monitorPerformance() {
        const checkPerformance = (currentTime) => {
            this.frameCount++;
            
            if (currentTime - this.lastTime >= 1000) {
                const fps = this.frameCount;
                this.frameCount = 0;
                this.lastTime = currentTime;
                
                // Reduce effects if performance is poor
                if (fps < 30) {
                    this.optimizeForPerformance();
                }
            }
            
            requestAnimationFrame(checkPerformance);
        };
        
        requestAnimationFrame(checkPerformance);
    }

    optimizeForPerformance() {
        // Reduce blur effects and animations for better performance
        document.querySelectorAll('.carousel-track').forEach(track => {
            track.style.willChange = 'transform';
        });
        
        document.querySelectorAll('.product-card, .testimonial-card').forEach(card => {
            card.style.willChange = 'transform';
        });
    }
}

// Initialize all carousel enhancements when DOM is loaded
new ModernCarousel();
new SmoothScrollEnhancer();
new CarouselPerformanceMonitor();

// Mobile Navigation Toggle
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

function setMenuOpen(isOpen) {
    if (!navMenu || !navToggle) return;
    navMenu.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    const bars = navToggle.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
        if (isOpen) {
            if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
            if (index === 1) bar.style.opacity = '0';
            if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        }
    });
}

if (navToggle && navMenu) {
    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setMenuOpen(!navMenu.classList.contains('active'));
    });

    document.addEventListener('click', (e) => {
        if (!navMenu.classList.contains('active')) return;
        if (!e.target.closest('.navbar')) {
            setMenuOpen(false);
        }
    });
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', () => {
        setMenuOpen(false);
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar scroll state
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Logo Preview Modal Functionality
class LogoPreviewModal {
    constructor() {
        this.modal = document.getElementById('logo-modal');
        this.logoTrigger = document.querySelector('.nav-logo');
        this.closeButton = document.querySelector('.logo-modal-close');
        this.backdrop = document.querySelector('.logo-modal-backdrop');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // Add click event to logo
        this.logoTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });
        
        // Add click event to close button
        this.closeButton.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Add click event to backdrop
        this.backdrop.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Add escape key listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });
        
        // Prevent modal content clicks from closing modal
        document.querySelector('.logo-modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    openModal() {
        this.isOpen = true;
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.isOpen = false;
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

// Initialize logo preview modal
new LogoPreviewModal();

// Hero entrance uses CSS animations — no typewriter

// Counter animation for product stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start).toLocaleString();
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    }
    updateCounter();
}

// Intersection Observer for counter animations
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                const number = parseInt(text.replace(/[^\d]/g, ''));
                if (number && !stat.classList.contains('animated')) {
                    stat.classList.add('animated');
                    animateCounter(stat, number);
                }
            });
        }
    });
}, observerOptions);

// Observe product cards for counter animation
document.querySelectorAll('.product-card').forEach(card => {
    counterObserver.observe(card);
});

// Floating animation for hero cards
function createFloatingAnimation() {
    const cards = document.querySelectorAll('.floating-card');
    cards.forEach((card, index) => {
        const randomDelay = Math.random() * 2;
        const randomDuration = 4 + Math.random() * 2;
        
        card.style.animationDelay = `${randomDelay}s`;
        card.style.animationDuration = `${randomDuration}s`;
    });
}

// Initialize floating animation
createFloatingAnimation();

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    `;
    
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Add notification animations to CSS
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Scroll progress indicator
function createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #db2777, #ec4899);
        z-index: 10001;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

// Initialize scroll progress
createScrollProgress();

// Lazy loading for images (if any are added later)
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
lazyLoadImages();

// Add hover effects for testimonial cards only (product cards use CSS)
document.querySelectorAll('.testimonial-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Tech stack items rotation animation
document.querySelectorAll('.tech-item').forEach((item, index) => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) rotate(5deg)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) rotate(0deg)';
    });
});

// Add sparkle effect to buttons
function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: #ffd700;
        border-radius: 50%;
        pointer-events: none;
        animation: sparkleAnimation 0.6s ease-out forwards;
        left: ${x}px;
        top: ${y}px;
        z-index: 1000;
    `;
    
    document.body.appendChild(sparkle);
    
    setTimeout(() => sparkle.remove(), 600);
}

// Add sparkle animation CSS
const sparkleStyles = document.createElement('style');
sparkleStyles.textContent = `
    @keyframes sparkleAnimation {
        0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
        }
        50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
        }
        100% {
            transform: scale(0) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(sparkleStyles);

// Add sparkle effect to primary buttons
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                createSparkle(
                    rect.left + x + (Math.random() - 0.5) * 20,
                    rect.top + y + (Math.random() - 0.5) * 20
                );
            }, i * 50);
        }
    });
});

// Performance optimization: Throttle scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Apply throttling to scroll events
window.addEventListener('scroll', throttle(() => {
    // Existing scroll handlers are already optimized
}, 16)); // ~60fps

console.log('🚀 MindBud Innovations website loaded successfully!');