import {Link} from 'react-router-dom';
import {useCart} from '@/hooks/useCart';
import {useProducts} from '@/hooks/useProducts';
import {safeShopImage3D} from './worldShop3D';

/** Uses the website cart and checkout route, preserving the current signed-in account. */
export default function GameCart3D({onClose}:{onClose:()=>void}){
 const cart=useCart(),{products,loading,error}=useProducts();
 const items=cart.lines.map(line=>({...line,product:products.find(p=>p.id===line.productId)}));
 const unavailable=items.some(line=>!line.product);
 const subtotal=items.reduce((total,line)=>total+(line.product?.memberPrice??0)*line.quantity,0);
 const money=(value:number)=>`RM ${value.toFixed(2)}`;
 const ready=cart.count>0&&!loading&&!error&&!unavailable;
 return <aside className="game-popover game-cart game-surface" aria-label="Shopping cart">
  <header><h2>Shopping cart <span>({cart.count})</span></h2><button className="game-icon-button" aria-label="Close shopping cart" onClick={onClose}>×</button></header>
  {loading&&cart.count>0?<p role="status">Loading your items…</p>:error&&cart.count>0?<p role="alert">Could not load current product details. Close and reopen the cart to retry.</p>:<>
   {!items.length?<p>Your cart is empty. Visit a shop and choose Buy · Add to cart.</p>:<ul className="game-cart-items">{items.map(({productId,quantity,product})=><li key={productId}>
    <img src={product&&safeShopImage3D(product.image)&&product.image?product.image:'/game3d/houses/market.svg'} alt=""/>
    <div className="game-cart-item-details"><strong>{product?.name??'Unavailable product'}</strong><span>{product?money(product.memberPrice):'This item is no longer available.'}</span>
     <div className="game-cart-quantity" role="group" aria-label={`Quantity for ${product?.name??'unavailable product'}`}><button aria-label={`Decrease quantity of ${product?.name??productId}`} onClick={()=>cart.setQuantity(productId,quantity-1)}>−</button><span aria-label={`${quantity} items`}>{quantity}</span><button aria-label={`Increase quantity of ${product?.name??productId}`} disabled={quantity>=99||!product} onClick={()=>cart.setQuantity(productId,quantity+1)}>+</button><button className="game-cart-remove" aria-label={`Remove ${product?.name??productId} from cart`} onClick={()=>cart.remove(productId)}>Remove</button></div>
    </div>
   </li>)}</ul>}
   {unavailable&&<p role="alert">Remove unavailable products before continuing.</p>}
  </>}
  <footer><div className="game-cart-subtotal"><strong>Subtotal</strong><strong>{loading||error?'—':money(subtotal)}</strong></div><small>Delivery and final totals are confirmed at H2H checkout.</small>{ready?<Link className="game-cart-checkout" to="/cart" onClick={onClose}>Proceed to H2H checkout <i className="ri-arrow-right-line" aria-hidden="true"/></Link>:<button className="game-cart-checkout" disabled>Proceed to H2H checkout</button>}</footer>
 </aside>;
}
