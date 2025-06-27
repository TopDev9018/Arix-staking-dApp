// AR_FRONTEND/src/components/ResponsiveMobileNav.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

const ResponsiveMobileNav = ({ menuConfig }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [visibleItems, setVisibleItems] = useState(menuConfig);
    const [hiddenItems, setHiddenItems] = useState([]);
    const [containerWidth, setContainerWidth] = useState(0);

    let currentPath = location.pathname;
    
    if (currentPath === '/') currentPath = '/game'; 
    if (!menuConfig.some(item => item.key === currentPath)) {
         const fallbackPath = '/game'; 
         
         if (location.pathname !== fallbackPath) {
              currentPath = fallbackPath;
         }
    }


    useEffect(() => {
        const calculateVisibleItems = () => {
            if (!containerRef.current) return;

            const currentContainerWidth = containerRef.current.offsetWidth;
            setContainerWidth(currentContainerWidth);
            
            const minTabWidth = 65; 
            const maxPossibleTabs = menuConfig.length;
            const moreButtonWidth = 60; 

            let numVisible = maxPossibleTabs;
            let totalWidthNeeded = maxPossibleTabs * minTabWidth;
            
            if (totalWidthNeeded > currentContainerWidth) {
                totalWidthNeeded += moreButtonWidth; 
                numVisible = Math.floor((currentContainerWidth - moreButtonWidth) / minTabWidth);
                numVisible = Math.max(1, Math.min(numVisible, maxPossibleTabs -1)); 
            } else {
                numVisible = maxPossibleTabs; 
            }

            const visible = menuConfig.slice(0, numVisible);
            const hidden = menuConfig.slice(numVisible);

            setVisibleItems(visible);
            setHiddenItems(hidden);
        };

        calculateVisibleItems();
        const debouncedCalculate = setTimeout(calculateVisibleItems, 50); 

        window.addEventListener('resize', calculateVisibleItems);
        return () => {
            clearTimeout(debouncedCalculate);
            window.removeEventListener('resize', calculateVisibleItems);
        };
    }, [menuConfig, location.pathname]); 

    const handleNavigation = (path) => {
        navigate(path);
    };
    
    const isHiddenItemSelected = hiddenItems.some(item => item.key === currentPath);

    const dropdownMenu = {
        items: hiddenItems.map(item => ({
            key: item.key,
            icon: React.cloneElement(item.icon, { style: { fontSize: '16px', marginRight: '8px', color: item.key === currentPath ? 'var(--app-primary-text-light)' : 'var(--app-primary-text-light)', opacity: item.key === currentPath ? 1 : 0.6 } }),
            label: <span style={{color: item.key === currentPath ? 'var(--app-primary-text-light)' : 'var(--app-primary-text-light)', opacity: item.key === currentPath ? 1 : 0.8}}>{item.labelText}</span>,
            onClick: () => handleNavigation(item.key),
        })),
    };

    
    const numItemsToShow = visibleItems.length + (hiddenItems.length > 0 ? 1 : 0);
    const itemFlexBasis = numItemsToShow > 0 ? `${100 / numItemsToShow}%` : 'auto';

    return (
        <div
            ref={containerRef}
            className="responsive-mobile-nav-container"
        >
            {visibleItems.map((item) => {
                const isSelected = currentPath === item.key;
                return (
                    <div
                        key={item.key}
                        className={`responsive-nav-item ${isSelected ? 'selected' : ''}`}
                        style={{ flexBasis: itemFlexBasis }}
                        onClick={() => handleNavigation(item.key)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => e.key === 'Enter' && handleNavigation(item.key)}
                    >
                        <div className="nav-item-icon">
                            {React.cloneElement(item.icon, {
                                style: {
                                    fontSize: containerWidth < 350 ? '18px' : '20px',
                                    color: isSelected ? 'var(--app-primary-text-light)' : 'inherit'
                                }
                            })}
                        </div>
                        <div className="nav-item-label" style={{color: isSelected ? 'var(--app-primary-text-light)' : 'inherit' }}>
                            {item.labelText}
                        </div>
                    </div>
                );
            })}

            {hiddenItems.length > 0 && (
                <Dropdown
                    menu={dropdownMenu}
                    placement="topRight"
                    trigger={['click']}
                    overlayClassName="responsive-nav-dropdown-overlay"
                >
                    <div
                        className={`responsive-nav-item more-button ${isHiddenItemSelected ? 'selected' : ''}`}
                        style={{ flexBasis: itemFlexBasis }}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="nav-item-icon">
                            <MoreOutlined style={{ fontSize: containerWidth < 350 ? '18px' : '20px', color: isHiddenItemSelected ? 'var(--app-primary-text-light)' : 'inherit' }}/>
                        </div>
                        <div className="nav-item-label" style={{color: isHiddenItemSelected ? 'var(--app-primary-text-light)' : 'inherit' }}>
                            MORE
                        </div>
                    </div>
                </Dropdown>
            )}
        </div>
    );
};

export default ResponsiveMobileNav;