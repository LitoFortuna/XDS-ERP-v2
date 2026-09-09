import React, { useState } from 'react';
import { MerchandiseItem } from '../../../../types';

interface StorePageProps {
    merchandise: MerchandiseItem[];
}

const StorePage: React.FC<StorePageProps> = ({ merchandise }) => {
    // State for selected variant (por id, no por talla -- dos variantes del mismo producto
    // podrían compartir talla, p.ej. mismo producto en dos colores) por nombre de producto.
    const [selectedVariantId, setSelectedVariantId] = useState<{ [productName: string]: string }>({});

    // Group merchandise by name (base product name)
    const groupedMerchandise = merchandise.reduce((acc, item) => {
        const key = item.name;
        if (!acc[key]) {
            acc[key] = {
                name: item.name,
                category: item.category,
                imageUrl: item.imageUrl,
                variants: [],
            };
        }
        acc[key].variants.push(item);
        return acc;
    }, {} as Record<string, { name: string; category: string; imageUrl?: string; variants: MerchandiseItem[] }>);

    const products = Object.values(groupedMerchandise);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const handleRequestProduct = (product: { name: string; variants: MerchandiseItem[] }) => {
        const variantId = selectedVariantId[product.name];
        const selectedVariant = product.variants.find(v => v.id === variantId);
        let message = `Hola! Me interesa el producto: ${product.name}`;

        if (selectedVariant?.size) {
            message += ` - Talla: ${selectedVariant.size}`;
        }

        const whatsappUrl = `https://wa.me/34692038911?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleVariantChange = (productName: string, variantId: string) => {
        setSelectedVariantId(prev => ({
            ...prev,
            [productName]: variantId
        }));
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                        </svg>
                        Merchandising
                    </h2>
                    <p className="text-gray-400 text-sm ml-10">{products.length} {products.length === 1 ? 'producto' : 'productos'} disponible{products.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product: { name: string; category: string; imageUrl?: string; variants: MerchandiseItem[] }) => {
                        // salePrice no está garantizado a nivel de Firestore (las reglas solo
                        // comprueban isAdmin(), no la forma del documento) -- sin este `?? 0` un
                        // artículo con el precio sin rellenar mostraba "NaN,00 €" a toda alumna.
                        const prices = product.variants.map((v) => v.salePrice ?? 0);
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                        const outOfStock = totalStock === 0;
                        const lowStock = !outOfStock && totalStock <= 5;
                        const needsVariantChoice = product.variants.length > 1;
                        const selectedVariant = product.variants.find(v => v.id === selectedVariantId[product.name]);
                        const canRequest = !outOfStock && (!needsVariantChoice || !!selectedVariant);

                        return (
                            <div
                                key={product.name}
                                className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden hover:border-purple-500/70 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group"
                            >
                                {/* Image Container */}
                                {product.imageUrl ? (
                                    <div className="aspect-square bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden relative">
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = `
                                                        <div class="w-full h-full flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    `;
                                                }
                                                console.warn('[StorePage] Failed to load image:', product.imageUrl);
                                            }}
                                        />
                                        {/* Stock Badge Overlay */}
                                        {outOfStock ? (
                                            <div className="absolute top-3 right-3 bg-gray-700/90 backdrop-blur-sm text-gray-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                                Agotado
                                            </div>
                                        ) : lowStock && (
                                            <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                                ¡Últimas unidades!
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="aspect-square bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-5">
                                    {/* Title and Category */}
                                    <div className="mb-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-white font-bold text-xl leading-tight flex-1 mr-2">{product.name}</h3>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${outOfStock
                                                ? 'bg-gray-600/30 text-gray-400 border border-gray-600/40'
                                                : lowStock
                                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                    : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                }`}>
                                                {outOfStock ? 'Agotado' : totalStock}
                                            </span>
                                        </div>
                                        <p className="text-purple-300 text-sm font-medium capitalize">{product.category}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-4">
                                        {minPrice === maxPrice ? (
                                            <p className="text-white font-bold text-2xl">{formatCurrency(minPrice)}</p>
                                        ) : (
                                            <div>
                                                <p className="text-gray-400 text-xs mb-0.5">Desde</p>
                                                <p className="text-white font-bold text-2xl">
                                                    {formatCurrency(minPrice)} <span className="text-gray-500 text-lg">- {formatCurrency(maxPrice)}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Size Selector */}
                                    {needsVariantChoice && !outOfStock && (
                                        <div className="mb-5">
                                            <label htmlFor={`size-${product.name}`} className="block text-xs text-gray-400 mb-2 font-medium">
                                                Selecciona tu talla
                                            </label>
                                            <select
                                                id={`size-${product.name}`}
                                                value={selectedVariantId[product.name] || ''}
                                                onChange={(e) => handleVariantChange(product.name, e.target.value)}
                                                className="w-full bg-gray-700/50 border border-gray-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-600/50 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                            >
                                                <option value="" className="bg-gray-800">Elige una talla...</option>
                                                {product.variants.map((variant) => (
                                                    <option
                                                        key={variant.id}
                                                        value={variant.id}
                                                        disabled={!variant.stock}
                                                        className="bg-gray-800"
                                                    >
                                                        {variant.size || 'S/T'} {!variant.stock ? '(agotado)' : variant.stock <= 3 ? `(Solo ${variant.stock} disponibles)` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Request Button */}
                                    <button
                                        onClick={() => handleRequestProduct(product)}
                                        disabled={!canRequest}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-green-900/30 hover:shadow-xl hover:shadow-green-900/40 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-green-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                        </svg>
                                        <span>{outOfStock ? 'Agotado' : 'Solicitar por WhatsApp'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700">
                    <div className="text-7xl mb-5">🛍️</div>
                    <p className="text-gray-400 text-lg font-medium">No hay productos disponibles en este momento</p>
                    <p className="text-gray-500 text-sm mt-2">Vuelve pronto para ver nuestras novedades</p>
                </div>
            )}
        </div>
    );
};

export default StorePage;
