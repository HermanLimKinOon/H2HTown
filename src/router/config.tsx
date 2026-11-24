import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Live from "../pages/live/page";
import Shop from "../pages/shop/page";
import ShopDetail from "../pages/shop/detail/page";
import CartPage from "../pages/shop/cart/page";
import Courses from "../pages/courses/page";
import CourseDetail from "../pages/courses/detail/page";
import MemberRegister from "../pages/members/register/page";
import MemberProfile from "../pages/members/profile/page";
import MemberInvite from "../pages/members/invite/page";
import MemberCourses from "../pages/members/courses/page";
import CourseLearn from "../pages/members/courses/learn/page";
import MemberOrders from "../pages/members/orders/page";
import PaymentReturn from "../pages/payment/return/page";
import About from "../pages/about/page";
import Team from "../pages/team/page";
import Contact from "../pages/contact/page";
import Careers from "../pages/careers/page";
import PressKit from "../pages/press-kit/page";
import PrivacyPolicy from "../pages/legal/privacy/page";
import TermsOfUse from "../pages/legal/terms/page";
import ReturnPolicy from "../pages/legal/returns/page";
import MembershipTerms from "../pages/legal/membership/page";
import Game from "../pages/game/page";
import Game3D from "../pages/game3d/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/live",
    element: <Live />,
  },
  {
    path: "/game",
    element: <Game />,
  },
  {
    path: "/game-3d",
    element: <Game3D />,
  },
  {
    path: "/shop",
    element: <Shop />,
  },
  {
    path: "/cart",
    element: <CartPage />,
  },
  {
    path: "/shop/:id",
    element: <ShopDetail />,
  },
  {
    path: "/courses",
    element: <Courses />,
  },
  {
    path: "/courses/:id",
    element: <CourseDetail />,
  },
  {
    path: "/members/register",
    element: <MemberRegister />,
  },
  {
    path: "/members/profile",
    element: <MemberProfile />,
  },
  {
    path: "/members/invite",
    element: <MemberInvite />,
  },
  {
    path: "/members/courses",
    element: <MemberCourses />,
  },
  {
    path: "/members/courses/:id",
    element: <CourseLearn />,
  },
  {
    path: "/members/orders",
    element: <MemberOrders />,
  },
  {
    path: "/payment/return",
    element: <PaymentReturn />,
  },
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "/team",
    element: <Team />,
  },
  {
    path: "/contact",
    element: <Contact />,
  },
  {
    path: "/careers",
    element: <Careers />,
  },
  {
    path: "/press-kit",
    element: <PressKit />,
  },
  {
    path: "/legal/privacy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/legal/terms",
    element: <TermsOfUse />,
  },
  {
    path: "/legal/returns",
    element: <ReturnPolicy />,
  },
  {
    path: "/legal/membership",
    element: <MembershipTerms />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
