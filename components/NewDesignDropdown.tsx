import React, { useState, useRef, useEffect } from 'react';
import { DesignType, GenerationOption } from '../types';
import { Button } from './ui';
import { SparklesIcon, ChevronDownIcon } from './icons';
import { CustomSizeModal } from './CustomSizeModal';

interface NewDesignDropdownProps {
    onCreateNewDesign: (type: DesignType, dimensions?: { width_mm: number, height_mm: number }) => void;
    onStartWizardWithType: (type: GenerationOption) => void;
}

export const NewDesignDropdown: React.FC<NewDesignDropdownProps> = ({ onCreateNewDesign, onStartWizardWithType }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const designGroups: { group: string; options: { label: string, type: GenerationOption }[] }[] = [
        {
            group: '홍보/이벤트',
            options: [
                { label: '포스터', type: DesignType.Poster },
                { label: '현수막/플래카드', type: DesignType.Banner },
                { label: '전단지', type: DesignType.Flyer },
                { label: '리플렛/팜플렛', type: DesignType.Leaflet },
                { label: '안내 책자', type: DesignType.Booklet },
                { label: '초대장', type: DesignType.Invitation },
                { label: '티켓/입장권', type: DesignType.Ticket },
                { label: '윈도우 시트지', type: DesignType.WindowSheeting },
            ]
        },
        {
            group: '매장용',
            options: [
                { label: '메뉴판', type: DesignType.Menu },
                { label: '테이블 세팅지', type: DesignType.TableSetting },
                { label: '쿠폰/스탬프 카드', type: DesignType.Coupon },
                { label: '테이블 텐트', type: DesignType.TableTent },
                { label: 'POP 광고물', type: DesignType.POP },
            ]
        },
        {
            group: '굿즈',
            options: [
                 { label: '티셔츠', type: DesignType.TShirt },
                 { label: '에코백', type: DesignType.EcoBag },
                 { label: '모자', type: DesignType.Cap },
                 { label: '파우치', type: DesignType.Pouch },
            ]
        },
        {
            group: '소매/제품',
            options: [
                 { label: '제품 태그', type: DesignType.ProductTag },
                 { label: '포장 스티커', type: DesignType.PackagingSticker },
                 { label: '상품권', type: DesignType.GiftCertificate },
                 { label: '제품 단상자', type: DesignType.ProductBox },
            ]
        },
        {
            group: '디지털',
            options: [
                { label: 'SNS 카드뉴스', type: DesignType.CardNews },
                { label: 'V컬러링', type: DesignType.VColoring },
                { label: '모바일 명함', type: DesignType.MobileBusinessCard },
                { label: '절기 문자', type: DesignType.SeasonalGreeting },
            ]
        },
         {
            group: '비즈니스',
            options: [
                { label: '명함 (인쇄용)', type: 'BusinessCardSet' },
            ]
        }
    ];
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (type: GenerationOption) => {
        onStartWizardWithType(type);
        setIsOpen(false);
    };

    const handleCustomSizeCreate = (dimensions: { width_mm: number, height_mm: number }) => {
        onCreateNewDesign(DesignType.Poster, dimensions); // Use a default type for custom sizes
        setIsModalOpen(false);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button onClick={() => setIsOpen(!isOpen)}>
                <SparklesIcon className="h-5 w-5 mr-2" />
                새 디자인
                <ChevronDownIcon className={`h-5 w-5 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30 max-h-96 overflow-y-auto">
                    <div className="py-1">
                        {designGroups.map(group => (
                            <div key={group.group}>
                                <h3 className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.group}</h3>
                                {group.options.map(option => (
                                    <a key={option.type} href="#" onClick={(e) => { e.preventDefault(); handleSelect(option.type); }}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        {option.label}
                                    </a>
                                ))}
                            </div>
                        ))}
                        <div className="border-t my-1"></div>
                         <a href="#" onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            사용자 정의 크기...
                        </a>
                    </div>
                </div>
            )}
            {isModalOpen && (
                <CustomSizeModal
                    onClose={() => setIsModalOpen(false)}
                    onCreate={handleCustomSizeCreate}
                />
            )}
        </div>
    );
};