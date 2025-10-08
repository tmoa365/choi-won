import React, { useState, useRef, useEffect } from 'react';
import { DesignType, GenerationOption } from '../types';
import { Button } from './ui';
import { SparklesIcon, ChevronDownIcon } from './icons';
import { CustomSizeModal } from './CustomSizeModal';

interface NewDesignDropdownProps {
    onCreateNewDesign: (type: DesignType, dimensions?: { width_mm: number, height_mm: number }) => void;
    onStartWizardWithType: (type: GenerationOption) => void;
    onStartSeasonalWizard: () => void;
}

export const NewDesignDropdown: React.FC<NewDesignDropdownProps> = ({ onCreateNewDesign, onStartWizardWithType, onStartSeasonalWizard }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const designGroups: { group: string; options: { label: string, type: GenerationOption }[] }[] = [
        {
            group: '홍보/이벤트',
            options: [
                { label: '포스터', type: DesignType.Poster },
                { label: '대형 현수막 (600x90cm)', type: DesignType.Banner },
                { label: '와이드 현수막 (600x30cm)', type: DesignType.WideBanner },
                { label: 'X배너 (60x180cm)', type: DesignType.XBanner },
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
        if (type === DesignType.SeasonalGreeting) {
            onStartSeasonalWizard();
        } else {
            onStartWizardWithType(type);
        }
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
                <div className="absolute right-0 mt-2 w-[40rem] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
                    <div className="p-6 grid grid-cols-3 gap-x-8 gap-y-6">
                        {designGroups.map(group => (
                            <div key={group.group}>
                                <h3 className="mb-3 text-sm font-semibold text-slate-900 uppercase tracking-wider">{group.group}</h3>
                                <ul className="space-y-1">
                                    {group.options.map(option => (
                                        <li key={option.type}>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleSelect(option.type); }}
                                                className="block px-2 py-1.5 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors">
                                                {option.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t bg-slate-50 p-3 rounded-b-md">
                         <a href="#" onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
                            className="block px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100 rounded-md font-semibold text-center transition-colors">
                            + 사용자 정의 크기로 만들기
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