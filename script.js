// Initialize AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        offset: 100
    });
});

// Enhanced Carousel Functionality
class ModernCarousel {
    constructor() {
        this.carousels = document.querySelectorAll('.carousel-track');
        this.init();
    }

    init() {
        this.carousels.forEach(carousel => {
            this.setupCarousel(carousel);
        });
        
        // Performance optimization
        this.setupIntersectionObserver();
        this.setupResizeHandler();
    }

    setupCarousel(carousel) {
        const cards = carousel.querySelectorAll('.product-card, .testimonial-card');
        const isProductsCarousel = carousel.classList.contains('products-carousel');
        
        // Only clone cards for testimonials carousel (auto-scroll), not products carousel
        if (!isProductsCarousel) {
            cards.forEach(card => {
                const clone = card.cloneNode(true);
                carousel.appendChild(clone);
            });

            // Add smooth pause/resume on hover for testimonials only
            carousel.addEventListener('mouseenter', () => {
                carousel.style.animationPlayState = 'paused';
            });

            carousel.addEventListener('mouseleave', () => {
                carousel.style.animationPlayState = 'running';
            });
        }

        // Ensure inner scroll wrapper exists and contains the track
        const container = carousel.closest('.carousel-container');
        let scrollWrap = container.querySelector('.carousel-scroll');
        if (!scrollWrap) {
            scrollWrap = document.createElement('div');
            scrollWrap.className = 'carousel-scroll';
            // insert as first child and move track inside
            container.insertBefore(scrollWrap, container.firstChild);
            scrollWrap.appendChild(carousel);
        } else if (carousel.parentElement !== scrollWrap) {
            scrollWrap.appendChild(carousel);
        }

        // Add touch/swipe support for mobile (use inner scroll wrapper as target)
        this.addTouchSupport(carousel, scrollWrap);

        // Setup scroll behaviors based on carousel type
        if (container && scrollWrap) {
            let resumeTimeout;

            const setInteracting = (isInteracting) => {
                carousel.dataset.userInteracting = isInteracting ? 'true' : 'false';
            };

            const pause = () => {
                // Cancel any pending resume to prevent premature animation restart
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

            // Infinite manual scroll loop logic on inner wrapper - only for testimonials
            const loopScrollIfNeeded = () => {
                if (isProductsCarousel) return; // No looping for products carousel
                
                const contentWidth = carousel.scrollWidth;
                const halfWidth = contentWidth / 2;
                const maxLeft = contentWidth - scrollWrap.clientWidth;
                const sl = scrollWrap.scrollLeft;
                const epsilon = Math.max(halfWidth * 0.05, 16); // 5% or at least 16px for mobile
                // Smoothly wrap instead of jumping
                if (sl <= epsilon) {
                    scrollWrap.scrollTo({ left: sl + halfWidth, behavior: 'smooth' });
                } else if (sl >= maxLeft - epsilon) {
                    scrollWrap.scrollTo({ left: sl - halfWidth, behavior: 'smooth' });
                }
            };

            // Initialize starting position
            requestAnimationFrame(() => {
                if (isProductsCarousel) {
                    // Products carousel starts at the beginning
                    scrollWrap.scrollLeft = 0;
                } else {
                    // Testimonials carousel starts at middle for seamless looping
                    const halfWidth = carousel.scrollWidth / 2;
                    if (halfWidth > 0) {
                        scrollWrap.scrollLeft = halfWidth;
                    }
                }
            });

            // Scroll-based pause/resume (horizontal scroll on inner wrapper)
            scrollWrap.addEventListener('scroll', () => {
                pause();
                loopScrollIfNeeded();
                // Debounced resume after scrolling settles
                scheduleResume(500);
            }, { passive: true });

            // Ensure continuous pausing while finger moves (mobile)
            scrollWrap.addEventListener('touchmove', () => {
                pause();
                loopScrollIfNeeded();
            }, { passive: true });

            // Touch interactions on container
            scrollWrap.addEventListener('touchstart', () => {
                pause();
            }, { passive: true });

            scrollWrap.addEventListener('touchend', () => {
                // Allow momentum to finish before resuming
                scheduleResume(600);
            }, { passive: true });

            // Pointer interactions (mouse or touch)
            scrollWrap.addEventListener('pointerdown', () => {
                pause();
            });
            scrollWrap.addEventListener('pointerup', () => {
                scheduleResume(400);
            });

            // Trackpad/mouse wheel horizontal scroll
            scrollWrap.addEventListener('wheel', (e) => {
                // Pause only when horizontal scroll happens
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    pause();
                    loopScrollIfNeeded();
                    scheduleResume(600);
                }
            }, { passive: true });

            // Create elegant desktop scroll buttons (attach to static container)
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

                const scrollAmount = 380; // approx one card width
                let holdInterval;

                const startHoldScroll = (direction) => {
                    pause();
                    clearInterval(holdInterval);
                    holdInterval = setInterval(() => {
                        scrollWrap.scrollBy({ left: direction * 20, behavior: 'smooth' });
                        loopScrollIfNeeded();
                    }, 16); // ~60fps small increments
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

                // Press-and-hold for continuous scroll
                leftBtn.addEventListener('pointerdown', () => startHoldScroll(-1));
                rightBtn.addEventListener('pointerdown', () => startHoldScroll(1));
                ['pointerup','pointerleave'].forEach(evt => {
                    leftBtn.addEventListener(evt, stopHoldScroll);
                    rightBtn.addEventListener(evt, stopHoldScroll);
                });
            }
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
                const carousel = entry.target;
                const userInteracting = carousel.dataset.userInteracting === 'true';
                if (entry.isIntersecting) {
                    // Only resume if user is not interacting
                    if (!userInteracting) {
                        carousel.style.animationPlayState = 'running';
                    }
                } else {
                    // Pause animation when not visible for performance
                    carousel.style.animationPlayState = 'paused';
                }
            });
        }, {
            threshold: 0.1
        });

        this.carousels.forEach(carousel => {
            observer.observe(carousel);
        });
    }

    setupResizeHandler() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.adjustCarouselSpeeds();
            }, 250);
        });
    }

    adjustCarouselSpeeds() {
        const screenWidth = window.innerWidth;
        
        this.carousels.forEach(carousel => {
            const isProducts = carousel.classList.contains('products-carousel');
            const isTestimonials = carousel.classList.contains('testimonials-carousel');
            
            // Adjust animation duration based on screen size
            if (screenWidth < 768) {
                if (isProducts) {
                    carousel.style.animationDuration = '40s';
                } else if (isTestimonials) {
                    carousel.style.animationDuration = '50s';
                }
            } else if (screenWidth < 1024) {
                if (isProducts) {
                    carousel.style.animationDuration = '50s';
                } else if (isTestimonials) {
                    carousel.style.animationDuration = '65s';
                }
            } else {
                // Reset to default speeds for larger screens
                if (isProducts) {
                    carousel.style.animationDuration = '60s';
                } else if (isTestimonials) {
                    carousel.style.animationDuration = '80s';
                }
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
        element.style.scrollBehavior = 'smooth';
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

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // Animate hamburger menu
    const bars = navToggle.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
        if (navMenu.classList.contains('active')) {
            if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
            if (index === 1) bar.style.opacity = '0';
            if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        }
    });
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const bars = navToggle.querySelectorAll('.bar');
        bars.forEach(bar => {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        });
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(15, 23, 42, 0.9)';
        navbar.style.backdropFilter = 'blur(30px)';
        navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(96, 165, 250, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
        navbar.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        navbar.style.transform = 'translateX(-50%) scale(0.98)';
    } else {
        navbar.style.background = 'rgba(15, 23, 42, 0.8)';
        navbar.style.backdropFilter = 'blur(25px)';
        navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(96, 165, 250, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
        navbar.style.borderColor = 'rgba(148, 163, 184, 0.2)';
        navbar.style.transform = 'translateX(-50%) scale(1)';
    }
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
        document.body.style.overflow = 'hidden';
        
        // Add elegant entrance animation
        setTimeout(() => {
            const logoImage = document.querySelector('.logo-preview-image');
            const logoInfo = document.querySelector('.logo-preview-info');
            
            logoImage.style.animation = 'modalLogoEntrance 0.6s ease-out forwards';
            logoInfo.style.animation = 'modalInfoEntrance 0.8s ease-out 0.2s forwards';
        }, 100);
    }
    
    closeModal() {
        this.isOpen = false;
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset animations
        setTimeout(() => {
            const logoImage = document.querySelector('.logo-preview-image');
            const logoInfo = document.querySelector('.logo-preview-info');
            
            logoImage.style.animation = '';
            logoInfo.style.animation = '';
        }, 400);
    }
}

// Initialize logo preview modal
new LogoPreviewModal();

// Typing animation for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Initialize typing animation when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.gradient-text');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        typeWriter(heroTitle, originalText, 80);
    }
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.floating-card');
    
    parallaxElements.forEach((element, index) => {
        const speed = 0.5 + (index * 0.1);
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

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

// Form submission handling
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const message = this.querySelector('textarea').value;
        
        // Simple validation
        if (!name || !email || !message) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        // Simulate form submission
        const submitBtn = this.querySelector('.btn-primary');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            this.reset();
            showNotification('Message sent successfully!', 'success');
        }, 2000);
    });
}

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

// Add hover effects for interactive elements
document.querySelectorAll('.product-card, .testimonial-card').forEach(card => {
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