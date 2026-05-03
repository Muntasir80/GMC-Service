import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Menu, 
  X, 
  ChevronRight,
  Clock,
  ExternalLink,
  Zap,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Package,
  Settings,
  Tag,
  Globe,
  Server,
  Upload,
  Printer,
  ShoppingCart,
  User,
  CreditCard,
  History,
  Search,
  ArrowRight
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  getDoc, 
  addDoc,
  deleteDoc,
  updateDoc,
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  setDoc,
  handleFirestoreError,
  OperationType,
  writeBatch
} from './lib/firebase';

// TYPES
interface AdminPermissions {
  canManageProducts: boolean;
  canManageSales: boolean;
  canManageSite: boolean;
  canManageAdmins: boolean;
  canManageApprovals: boolean;
}

interface DeletionRequest {
  id?: string;
  targetId: string;
  targetType: string;
  requestedBy: string;
  requestedByName: string;
  reason: string;
  approvals: string[];
  status: 'pending' | 'approved' | 'executed';
  createdAt: any;
}

interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  password?: string;
  role: 'super' | 'staff';
  permissions: AdminPermissions;
}

interface Product {
  id: string;
  name: string;
  description: string;
  sellingPrice: number;
  purchasePrice?: number; // Only fetched for admins
  category: string;
  brand: string;
  model: string;
  quantity: number;
  imageUrl: string;
  hasWarranty: boolean;
  warrantyDuration: string;
  serialNumber: string;
  createdAt: any;
}

interface SiteContent {
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroBadge: string;
  footerText: string;
  logoText: string;
  logoIcon: string;
  logoImageUrl?: string;
  contactLocation: string;
  contactSlogan: string;
  contactPhone: string;
  contactWhatsApp: string;
  services: {
    id: string;
    icon: string;
    title: string;
    description: string;
    details: string[];
  }[];
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  faqs: {
    q: string;
    a: string;
  }[];
}

interface Sale {
  id?: string;
  invoiceNo: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  total: number;
  customerName: string;
  customerPhone: string;
  staffId: string;
  staffEmail: string;
  staffName?: string;
  createdAt: any;
  status?: 'pending' | 'completed' | 'denied';
  approvedBy?: string;
  approvedByName?: string;
}

const INITIAL_SITE_CONTENT: SiteContent = {
  heroTitleLine1: "ALWAYS ON",
  heroTitleLine2: "YOUR SERVICE",
  heroSubtitle: "Chittagong's trusted partner for Professional Computer Repair and IT Solutions. Reliable tech support at your doorstep.",
  heroBadge: "Grow Mir Computer Service",
  footerText: "Grow Mir Computer Service - Chittagong's trusted partner for modern IT solutions and professional technical support.",
  logoText: "GMC SERVICE",
  logoIcon: "Zap",
  logoImageUrl: "",
  contactLocation: "Chittagong, Bangladesh",
  contactSlogan: "\"Always on your service\"",
  contactPhone: "+880 1851-118215",
  contactWhatsApp: "https://wa.me/8801851118215",
  services: [
    {
      id: "repair",
      icon: "Monitor",
      title: "Computer Repair",
      description: "Expert diagnosis and repair for Laptops and Desktops. Software installation, OS cleanups, and virus removal.",
      details: ["Laptop Repair", "Desktop Troubleshooting", "OS Installation", "Virus Removal"]
    },
    {
      id: "network",
      icon: "Globe",
      title: "Network Support",
      description: "Professional networking solutions including router configuration, Wi-Fi optimization, and secure office network setup.",
      details: ["Wired/Wireless Setup", "Router Configuration", "Network Security", "VPN Management"]
    },
    {
      id: "it-services",
      icon: "Server",
      title: "IT Services",
      description: "Corporate IT support, data backup solutions, and tailored technology consulting for businesses of all sizes.",
      details: ["Data Recovery", "Cloud Solutions", "Tech Consulting", "AMC Services"]
    }
  ],
  features: [
    { title: "Always Open", description: "Tech emergencies happen anytime. We are here.", icon: "Clock" },
    { title: "Expert Team", description: "Specialists in security and computing.", icon: "CheckCircle2" },
    { title: "Local Presence", description: "Proudly serving the heart of Chittagong.", icon: "MapPin" },
    { title: "Transparent", description: "No hidden costs, honest advice always.", icon: "ExternalLink" }
  ],
  faqs: [
    { q: "Do you provide home service?", a: "Yes! We offer on-site diagnosis and repair solutions across Chittagong for your convenience." },
    { q: "How long does a typical repair take?", a: "Most software issues and hardware upgrades (like SSDs) are completed within the same day. Complex hardware repairs may take 2-3 business days." },
    { q: "Do you offer warranties on parts?", a: "We provide official manufacturer warranties on all hardware replacements and upgrades handled by us." }
  ]
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, _setUser] = useState<any>(null);
  const userRef = useRef<any>(null);
  const setUser = (val: any) => {
    if (typeof val === 'function') {
      _setUser((prev: any) => {
        const next = val(prev);
        userRef.current = next;
        return next;
      });
    } else {
      _setUser(val);
      userRef.current = val;
    }
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<AdminPermissions | null>(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'google' | 'staff'>('google');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [staffLogin, setStaffLogin] = useState({ email: '', password: '', displayName: '' });
  const [siteContent, setSiteContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);
  
  // Sales State
  const [cart, setCart] = useState<{product: Product, quantity: number, price: number}[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [pastSales, setPastSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    sellingPrice: '',
    purchasePrice: '',
    category: 'Toners',
    brand: 'G&G',
    model: '',
    quantity: 1,
    hasWarranty: false,
    warrantyDuration: '',
    serialNumber: '',
    imageUrl: 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?q=80&w=800&auto=format&fit=crop'
  });

    // Admin Email from user request
    const SUPER_ADMIN_EMAILS = ["mirmuntasiralamehad@gmail.com", "computervillage371@gmail.com"];
    const [adminList, setAdminList] = useState<AdminUser[]>([]);
    const [adminTab, setAdminTab] = useState<'products' | 'staff' | 'site' | 'sales' | 'sales-history' | 'approvals'>('products');
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState<Sale | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
      email: '',
      username: '',
      password: '',
      displayName: ''
    });

    const [editSiteContent, setEditSiteContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);
    const [showShareModal, setShowShareModal] = useState(false);

    const APP_URLS = {
      development: "https://ais-dev-l7y45xpibz3sxhdcku6eby-612939934035.asia-east1.run.app",
      shared: "https://ais-pre-l7y45xpibz3sxhdcku6eby-612939934035.asia-east1.run.app"
    };

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Check for admin status
        try {
          const adminDoc = await getDoc(doc(db, 'admins', authUser.uid));
          const isSuperByEmail = authUser.email && SUPER_ADMIN_EMAILS.includes(authUser.email);
          
          let adminData = adminDoc.exists() ? adminDoc.data() : null;
          
          // If not found by UID, try finding by email (for newly added staff)
          if (!adminData && authUser.email) {
            const adminQuery = query(collection(db, 'admins'), orderBy('email'));
            // Note: We can't use where('email', '==', ...) easily without an index for this specific case if not careful,
            // but for a small admin list, checking the local docs is fine or we can just fetch if they are an admin.
            // Actually, let's just use a simple getDocs with a query for better performance.
            const { getDocs, where } = await import('firebase/firestore');
            const q = query(collection(db, 'admins'), where('email', '==', authUser.email.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const docSnap = querySnapshot.docs[0];
              adminData = docSnap.data();
              // Sync UID: Update the admin doc to use the real UID for future fast lookups
              try {
                await setDoc(doc(db, 'admins', authUser.uid), {
                  ...adminData,
                  lastLogin: serverTimestamp()
                });
                // Optionally delete the old one if it was a different ID
                if (docSnap.id !== authUser.uid) {
                  await deleteDoc(doc(db, 'admins', docSnap.id));
                }
              } catch (e) {
                console.log("Could not sync admin UID", e);
              }
            }
          }

          if (adminData || isSuperByEmail) {
            setUser(authUser);
            setIsAdmin(true);
            
            const existingData = adminData;
            const defaultPermissions: AdminPermissions = { 
              canManageProducts: true, 
              canManageSales: true, 
              canManageSite: true,
              canManageAdmins: isSuperByEmail ? true : false,
              canManageApprovals: isSuperByEmail ? true : false
            };
            
            setUserPermissions(existingData?.permissions || defaultPermissions);
            setUserDisplayName(existingData?.displayName || '');
            
            // Bootstrap super admin doc if it doesn't exist but email matches
            if (!adminDoc.exists() && isSuperByEmail) {
              try {
                await setDoc(doc(db, 'admins', authUser.uid), { 
                  email: authUser.email, 
                  role: 'super',
                  permissions: defaultPermissions
                });
              } catch (e) {
                console.log("Auto-bootstrap admin doc failed", e);
              }
            }
          } else {
            // Not an admin - check if it's a new login attempt
            setIsAdmin(false);
            setUserPermissions(null);
            setUser(null);
            
            // "no one can login unless admin gives them account"
            // Sign out users who are not in the admin list
            await signOut(auth);
            alert("Access Denied: Your account is not authorized. Please contact an admin to grant access.");
          }
        } catch (e: any) {
          if (e.code === 'permission-denied') {
            console.log("Not an admin or permission denied reading admin doc");
            setIsAdmin(false);
            setUser(null);
          } else {
            console.error("Error checking admin status:", e);
            setIsAdmin(false);
            setUser(null);
          }
        }
      } else {
        // Only clear if NOT a staff manual login
        if (!userRef.current?.isStaffLogin) {
           setUser(null);
           setIsAdmin(false);
        }
      }
    });

    // Sub to products
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubProducts = onSnapshot(q, async (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // If admin, try to fetch private pricing info
      if (isAdmin) {
        const enrichedProds = await Promise.all(prods.map(async (p) => {
          try {
            const privateDoc = await getDoc(doc(db, 'products', p.id, 'private', 'pricing'));
            if (privateDoc.exists()) {
              return { ...p, purchasePrice: privateDoc.data().purchasePrice };
            }
          } catch (e) {
            console.log("Could not fetch private pricing for", p.id);
          }
          return p;
        }));
        setProducts(enrichedProds);
      } else {
        setProducts(prods);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // Sub to site content
    const unsubSite = onSnapshot(doc(db, 'siteContent', 'v1'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const merged: SiteContent = {
          ...INITIAL_SITE_CONTENT,
          ...data,
          // Ensure arrays exist even if doc is old
          services: data.services || INITIAL_SITE_CONTENT.services,
          features: data.features || INITIAL_SITE_CONTENT.features,
          faqs: data.faqs || INITIAL_SITE_CONTENT.faqs,
        };
        setSiteContent(merged);
        setEditSiteContent(merged);
      } else {
        // Init with defaults if not exists
        if (isAdmin || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email))) {
          setDoc(doc(db, 'siteContent', 'v1'), INITIAL_SITE_CONTENT);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubProducts();
      unsubSite();
    };
  }, []); // Empty dependency array for listeners

  // Staff management sub
  useEffect(() => {
    let unsubAdmins: any;
    const isSuperByEmail = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
    if (isAdmin && isSuperByEmail) {
        unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
            setAdminList(snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            })) as AdminUser[]);
        }, (error) => {
            console.error("Admin list sub error:", error);
        });
    }

    // Sub to sales if staff
    let unsubSales: any;
    if (isAdmin && userPermissions?.canManageSales) {
      const qs = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
      unsubSales = onSnapshot(qs, (snapshot) => {
        setPastSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[]);
      });
    }

    // Sub to deletion requests if admin
    let unsubDeletions: any;
    if (isAdmin) {
      const qd = query(collection(db, 'deletion_requests'), orderBy('createdAt', 'desc'));
      unsubDeletions = onSnapshot(qd, (snapshot) => {
        setDeletionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeletionRequest[]);
      });
    }

    return () => {
        if (unsubAdmins) unsubAdmins();
        if (unsubSales) unsubSales();
        if (unsubDeletions) unsubDeletions();
    };
  }, [isAdmin, user, userPermissions]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSuperByEmail = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
    if (!isSuperByEmail && !userPermissions?.canManageAdmins) return;
    
    if (!newAdmin.email.includes('@')) {
        alert("Please enter a valid email");
        return;
    }

    try {
        await addDoc(collection(db, 'admins'), { 
            email: newAdmin.email.trim().toLowerCase(),
            username: newAdmin.username.trim(),
            password: newAdmin.password,
            displayName: newAdmin.displayName.trim(),
            role: 'staff',
            permissions: {
              canManageProducts: false,
              canManageSales: true,
              canManageSite: false,
              canManageAdmins: false,
              canManageApprovals: false
            },
            addedBy: user.email,
            createdAt: serverTimestamp()
        });
        setNewAdmin({ email: '', username: '', password: '', displayName: '' });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'admins');
    }
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    const isSuperByEmail = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
    if (!isSuperByEmail && !userPermissions?.canManageAdmins) return;
    if (email && SUPER_ADMIN_EMAILS.includes(email)) return; // Can't remove super admin via this UI

    if (confirm(`Are you sure you want to remove ${email} from the admin list?`)) {
      try {
        await deleteDoc(doc(db, 'admins', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
      }
    }
  };

  const handleRequestDeletion = async () => {
    if (!deletionTarget || !deletionReason) return;
    try {
      // Create request with target ID (sale ID) as document ID for easy rule checking
      await setDoc(doc(db, 'deletion_requests', deletionTarget.id!), {
        targetId: deletionTarget.id,
        targetType: 'sale',
        requestedBy: user.uid,
        requestedByName: userDisplayName || user.email,
        reason: deletionReason,
        approvals: [],
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowDeletionModal(false);
      setDeletionTarget(null);
      setDeletionReason('');
      alert("Deletion request sent. Waiting for peer approval.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deletion_requests');
    }
  };

  const handleApproveDeletion = async (request: DeletionRequest) => {
    if (!user || request.requestedBy === user.uid) {
      alert("You cannot approve your own request.");
      return;
    }
    if (request.approvals.includes(user.uid)) {
      alert("You have already approved this request.");
      return;
    }

    try {
      const newApprovals = [...request.approvals, user.uid];
      const updates: any = { approvals: newApprovals };
      
      // If 1 approval from someone else is enough (adjust as needed)
      if (newApprovals.length >= 1) {
        updates.status = 'approved';
      }

      await updateDoc(doc(db, 'deletion_requests', request.id!), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deletion_requests/${request.id}`);
    }
  };

  const handleExecuteDeletion = async (request: DeletionRequest) => {
    if (request.status !== 'approved') return;

    try {
      const batch = writeBatch(db);
      
      // Delete the actual scale
      batch.delete(doc(db, 'sales', request.targetId));
      
      // Mark request as executed (or delete it)
      batch.update(doc(db, 'deletion_requests', request.id!), { 
        status: 'executed',
        executedAt: serverTimestamp() 
      });

      await batch.commit();
      alert("Sale deleted successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${request.targetId}`);
    }
  };

  const handleUpdateAdminProfile = async (adminId: string, updates: Partial<AdminUser>) => {
    if (user?.email && !SUPER_ADMIN_EMAILS.includes(user.email)) return;
    try {
      await updateDoc(doc(db, 'admins', adminId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admins/${adminId}`);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      if (isSignUpMode) {
        // Create user with Email/Password
        await createUserWithEmailAndPassword(auth, staffLogin.email, staffLogin.password);
        alert("Account created successfully! If your email was pre-approved by an admin, you will be logged in. Otherwise, please contact an administrator to activate your account.");
        setIsSignUpMode(false);
      } else {
        // Sign in with Email/Password
        await signInWithEmailAndPassword(auth, staffLogin.email, staffLogin.password);
        setShowLoginModal(false);
      }
    } catch (error: any) {
      console.error("Auth action failed:", error);
      let message = "Authentication failed. Please check your credentials.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already in use.";
      if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') message = "Invalid email or password.";
      alert(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !userPermissions?.canManageSales) return;
    if (cart.length === 0) return;

    try {
      const timestampRef = Date.now().toString().slice(-6);
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const invoiceNo = `GROW-MIR-S-${timestampRef}-${randomSuffix}`;

      const isSuper = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
      const requiresApproval = !isSuper;

      const saleData: Sale = {
        invoiceNo,
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        staffId: user.uid,
        staffEmail: user.email,
        staffName: userDisplayName || user.email,
        createdAt: serverTimestamp(),
        status: requiresApproval ? 'pending' : 'completed'
      };

      if (!requiresApproval) {
        // Perform stock update immediately for super admins
        const batch = writeBatch(db);
        const newSaleRef = doc(collection(db, 'sales'));
        batch.set(newSaleRef, saleData);

        cart.forEach(item => {
          const productRef = doc(db, 'products', item.product.id);
          batch.update(productRef, {
            quantity: item.product.quantity - item.quantity,
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
        alert("Sale recorded and stock updated!");
        setSelectedSale({ ...saleData, id: newSaleRef.id, createdAt: new Date() } as any);
      } else {
        // Just create the sale record as pending
        const newSaleRef = await addDoc(collection(db, 'sales'), saleData);
        alert("Sale order submitted for approval!");
      }

      setCart([]);
      setCustomerInfo({ name: '', phone: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sales');
    }
  };

  const handleApproveSale = async (sale: Sale) => {
    if (!isAdmin || !userPermissions?.canManageApprovals) return;
    if (sale.staffId === user?.uid) {
      alert("You cannot approve your own sale order.");
      return;
    }

    if (confirm("Approve this sale and update inventory stock?")) {
      try {
        const batch = writeBatch(db);
        const saleRef = doc(db, 'sales', sale.id!);
        
        batch.update(saleRef, {
          status: 'completed',
          approvedBy: user.uid,
          approvedByName: userDisplayName || user.email,
          updatedAt: serverTimestamp()
        });

        // Update stock
        for (const item of sale.items) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentQty = productSnap.data().quantity || 0;
            batch.update(productRef, {
              quantity: currentQty - item.quantity,
              updatedAt: serverTimestamp()
            });
          }
        }

        await batch.commit();
        alert("Sale approved and inventory updated!");
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'sales');
      }
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log("Login popup was closed before completion.");
      } else if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        const msg = `This domain (${domain}) is not authorized in your Firebase project. Please add it to "Authorized Domains" in the Firebase Console (Authentication > Settings).`;
        console.error(msg, error);
        alert(msg);
      } else {
        console.error("Login failed", error);
        alert(`Login failed: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setShowAdminPanel(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (newProduct.imageUrl.length > 950000) {
      alert("Image is too large for the database. Please use a smaller image or a URL.");
      return;
    }

    try {
      const batch = writeBatch(db);
      const productRef = doc(collection(db, 'products'));
      
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        sellingPrice: parseFloat(newProduct.sellingPrice as string),
        category: newProduct.category,
        brand: newProduct.brand,
        model: newProduct.model,
        quantity: newProduct.quantity,
        hasWarranty: newProduct.hasWarranty,
        warrantyDuration: newProduct.warrantyDuration,
        serialNumber: newProduct.serialNumber,
        imageUrl: newProduct.imageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      batch.set(productRef, productData);
      
      const privateRef = doc(db, 'products', productRef.id, 'private', 'pricing');
      batch.set(privateRef, {
        purchasePrice: parseFloat(newProduct.purchasePrice as string)
      });

      await batch.commit();

      setNewProduct({
        name: '',
        description: '',
        sellingPrice: '',
        purchasePrice: '',
        category: 'Toners',
        brand: 'G&G',
        model: '',
        quantity: 1,
        hasWarranty: false,
        warrantyDuration: '',
        serialNumber: '',
        imageUrl: 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?q=80&w=800&auto=format&fit=crop'
      });
      alert("Product added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handlePaste = async (e?: React.ClipboardEvent | React.MouseEvent) => {
    try {
      let item: DataTransferItem | null = null;
      
      if (e && 'clipboardData' in e) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            item = items[i];
            break;
          }
        }
      } else {
        if (!navigator.clipboard || !navigator.clipboard.read) {
          throw new Error("Clipboard reading is not supported or blocked in this browser context (try Ctrl+V)");
        }
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
            const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
            if (imageTypes.length > 0) {
                const blob = await clipboardItem.getType(imageTypes[0]);
                const reader = new FileReader();
                reader.onloadend = () => {
                   setNewProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
      }

      if (item) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
          };
          reader.readAsDataURL(blob);
        }
      }
    } catch (err: any) {
      console.error("Paste failed", err);
      // Only show alert if it's not a generic clipboard event error which often happens naturally
      if (err.name === 'NotAllowedError' || err.message?.includes('permission') || err.message?.includes('blocked')) {
        alert("Paste access blocked. Please open the app in a new tab for full clipboard support, or use Ctrl+V inside the form.");
      }
    }
  };

  useEffect(() => {
    const globalPaste = (e: ClipboardEvent) => {
      if (showAdminPanel) {
        handlePaste(e as unknown as React.ClipboardEvent);
      }
    };
    window.addEventListener('paste', globalPaste);
    return () => window.removeEventListener('paste', globalPaste);
  }, [showAdminPanel]);

  const handleDeleteProduct = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleUpdateSiteContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'siteContent', 'v1'), editSiteContent);
      alert("Site content updated successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'siteContent/v1');
    }
  };

  const getIconComponent = (iconName: string, className = "w-8 h-8") => {
    switch (iconName) {
      case "Monitor": return <Monitor className={className} />;
      case "Globe": return <Globe className={className} />;
      case "Server": return <Server className={className} />;
      case "Cpu": return <Cpu className={className} />;
      case "ShieldCheck": return <ShieldCheck className={className} />;
      case "Zap": return <Zap className={className} />;
      case "Clock": return <Clock className={className} />;
      case "CheckCircle2": return <CheckCircle2 className={className} />;
      case "MapPin": return <MapPin className={className} />;
      case "ExternalLink": return <ExternalLink className={className} />;
      default: return <Monitor className={className} />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-400 bg-[#050505] text-zinc-100 antialiased">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-emerald-500/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center overflow-hidden">
              {siteContent.logoImageUrl ? (
                <img src={siteContent.logoImageUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                getIconComponent(siteContent.logoIcon, "w-6 h-6 text-black fill-black")
              )}
            </div>
            <span className="font-display font-bold text-xl tracking-tight uppercase">
              {siteContent.logoText}
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#products" className="hover:text-emerald-400 transition-colors">Products</a>
            <a href="#services" className="hover:text-emerald-400 transition-colors">Services</a>
            <a href="#contact" className="hover:text-emerald-400 transition-colors">Contact</a>
            
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Share App
            </button>
            
            {user ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <button 
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="p-2 rounded-full hover:bg-emerald-500/10 text-emerald-500 transition-all flex items-center gap-2 text-xs uppercase font-bold"
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            )}

            <a 
              href="tel:+8801851118215" 
              className="bg-emerald-500 text-black px-6 py-2.5 rounded-full hover:bg-emerald-400 transition-all font-bold flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Call Now
            </a>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-zinc-100" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#050505] pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-2xl font-display font-bold">
              <a href="#products" onClick={() => setIsMenuOpen(false)} className="pb-4 border-b border-emerald-900/30">Products</a>
              <a href="#services" onClick={() => setIsMenuOpen(false)} className="pb-4 border-b border-emerald-900/30">Services</a>
              <a href="#contact" onClick={() => setIsMenuOpen(false)} className="pb-4 border-b border-emerald-900/30">Contact</a>
              
              {user ? (
                <>
                  {isAdmin && (
                    <button onClick={() => { setShowAdminPanel(true); setIsMenuOpen(false); }} className="text-emerald-500 pb-4 border-b border-emerald-900/30 text-left">Admin Panel</button>
                  )}
                  <button onClick={handleLogout} className="text-red-400 pb-4 border-b border-emerald-900/30 text-left">Sign Out</button>
                </>
              ) : (
                <button onClick={handleLogin} className="pb-4 border-b border-emerald-900/30 text-left">Login</button>
              )}

              <a href="tel:+8801851118215" className="bg-emerald-500 text-black p-4 rounded-xl flex items-center justify-center gap-2">
                <Phone className="w-6 h-6" />
                Call Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal Overlay */}
      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-emerald-500/20 w-full max-w-4xl p-8 rounded-[2rem] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold flex items-center gap-3">
                  <Settings className="text-emerald-500" />
                  Admin Dashboard
                </h2>
                <div className="flex bg-white/5 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                  <button 
                    onClick={() => setAdminTab('products')}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${adminTab === 'products' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Inventory
                  </button>
                  {isAdmin && userPermissions?.canManageSales && (
                    <button 
                      onClick={() => setAdminTab('sales')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${adminTab === 'sales' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      New Sale
                    </button>
                  )}
                  {isAdmin && userPermissions?.canManageSales && (
                    <button 
                      onClick={() => setAdminTab('sales-history')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${adminTab === 'sales-history' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      History
                    </button>
                  )}
                  {isAdmin && userPermissions?.canManageSite && (
                    <button 
                      onClick={() => setAdminTab('site')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${adminTab === 'site' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Site Content
                    </button>
                  )}
                  {user?.email && SUPER_ADMIN_EMAILS.includes(user.email) && (
                    <button 
                      onClick={() => setAdminTab('staff')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${adminTab === 'staff' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Staff
                    </button>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={() => setAdminTab('approvals')}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${adminTab === 'approvals' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Approvals {deletionRequests.filter(r => r.status === 'pending').length > 0 && `(${deletionRequests.filter(r => r.status === 'pending').length})`}
                    </button>
                  )}
                </div>
                <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X />
                </button>
              </div>

              {adminTab === 'products' ? (
                <div className="grid lg:grid-cols-2 gap-12">
                  {/* Add Product Form */}
                  {userPermissions?.canManageProducts ? (
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                         <Plus className="text-emerald-500" /> Add New Product
                      </h3>
                      <form onSubmit={handleAddProduct} className="space-y-4">
                        <div>
                          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Product Name</label>
                          <input 
                            required
                            value={newProduct.name}
                            onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                            placeholder="e.g. G&G Toner Cartridge"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Category</label>
                            <select 
                              value={newProduct.category}
                              onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                            >
                              <option value="Toners">Toners</option>
                              <option value="Components">Components</option>
                              <option value="Peripherals">Peripherals</option>
                              <option value="Services">Services</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Brand</label>
                            <input 
                              value={newProduct.brand}
                              onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                              placeholder="e.g. G&G, HP"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Model</label>
                            <input 
                              required
                              value={newProduct.model}
                              onChange={e => setNewProduct({...newProduct, model: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                              placeholder="e.g. 12A, CF280A"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Purchase Price</label>
                            <input 
                              required
                              type="number"
                              min="0"
                              value={newProduct.purchasePrice}
                              onChange={e => setNewProduct({...newProduct, purchasePrice: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                              placeholder="e.g. 2000"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Selling Price</label>
                            <input 
                              required
                              type="number"
                              min="0"
                              value={newProduct.sellingPrice}
                              onChange={e => setNewProduct({...newProduct, sellingPrice: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                              placeholder="e.g. 2500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Warranty Serial</label>
                            <input 
                              value={newProduct.serialNumber}
                              onChange={e => setNewProduct({...newProduct, serialNumber: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                              placeholder="e.g. SN123456"
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-6">
                            <input 
                              type="checkbox"
                              id="hasWarranty"
                              checked={newProduct.hasWarranty}
                              onChange={e => setNewProduct({...newProduct, hasWarranty: e.target.checked})}
                              className="w-5 h-5 rounded border-white/10 bg-white/5 text-emerald-500"
                            />
                            <label htmlFor="hasWarranty" className="text-sm text-zinc-400">Has Warranty</label>
                          </div>
                          {newProduct.hasWarranty && (
                            <div>
                              <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Warranty Time</label>
                              <input 
                                value={newProduct.warrantyDuration}
                                onChange={e => setNewProduct({...newProduct, warrantyDuration: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                                placeholder="e.g. 1 Year, 3 Years"
                              />
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Available Quantity</label>
                            <input 
                              type="number"
                              min="0"
                              value={newProduct.quantity}
                              onChange={e => setNewProduct({...newProduct, quantity: parseInt(e.target.value) || 0})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Description</label>
                          <textarea 
                            required
                            rows={3}
                            value={newProduct.description}
                            onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                            placeholder="Premium quality toner for laser printers..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Image</label>
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-4">
                               <input 
                                value={newProduct.imageUrl.startsWith('data:') ? 'Image from clipboard' : newProduct.imageUrl}
                                onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none text-sm"
                                placeholder="Image URL or paste image"
                              />
                              <button 
                                type="button"
                                onClick={() => handlePaste()}
                                className="w-full py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                              >
                                <Plus className="w-3 h-3" />
                                Paste from Clipboard
                              </button>
                            </div>
                            {newProduct.imageUrl && (
                              <div className="w-24 h-24 rounded-xl border border-white/10 overflow-hidden bg-black flex-shrink-0">
                                <img src={newProduct.imageUrl} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                        <button className="w-full bg-emerald-500 text-black font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all">
                          Add Product
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-3xl border border-white/10">
                       <ShieldCheck className="w-12 h-12 text-emerald-500 mb-4" />
                       <h3 className="font-bold mb-2">View Only</h3>
                       <p className="text-zinc-500 text-sm">You have permission to view inventory, but not to add products.</p>
                    </div>
                  )}

                  {/* Manage Products List */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                       <Package className="text-emerald-500" /> Current Inventory
                    </h3>
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        placeholder="Search products..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-sm outline-none focus:border-emerald-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                      {products.filter(p => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(query) ||
                          p.brand.toLowerCase().includes(query) ||
                          p.category.toLowerCase().includes(query) ||
                          (p.model && p.model.toLowerCase().includes(query)) ||
                          (p.serialNumber && p.serialNumber.toLowerCase().includes(query))
                        );
                      }).map(prod => (
                        <div key={prod.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group">
                          <div className="flex items-center gap-4">
                            <img src={prod.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                            <div>
                               <div className="font-bold text-sm">{prod.name}</div>
                               <div className="text-xs text-zinc-500">
                                 {prod.category} &bull; Selling: {prod.sellingPrice} BDT
                                 {isAdmin && prod.purchasePrice && (
                                   <span className="ml-2 text-emerald-500/50 font-bold border-l border-white/10 pl-2">
                                     Buy: {prod.purchasePrice} BDT
                                   </span>
                                 )}
                               </div>
                               <div className="flex gap-2 items-center mt-1">
                                  <div className={`text-[10px] font-bold ${prod.quantity < 5 ? 'text-red-400' : 'text-emerald-500'}`}>
                                    Stock: {prod.quantity}
                                  </div>
                                  {prod.serialNumber && (
                                    <span className="text-[10px] text-zinc-600 font-mono">SN: {prod.serialNumber}</span>
                                  )}
                               </div>
                            </div>
                          </div>
                          {userPermissions?.canManageProducts && (
                            <button 
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                            >
                               <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : adminTab === 'sales' ? (
                <div className="grid lg:grid-cols-2 gap-12">
                   {/* Sales Terminal - Product Picker */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-500">
                          <ShoppingCart className="w-5 h-5" /> Product Selector
                        </h3>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                          Select to Add
                        </span>
                      </div>
                      
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                          placeholder="Search items for sale..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-emerald-500/50"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                         {products
                           .filter(p => p.quantity > 0 && (!searchQuery || 
                              p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (p.serialNumber && p.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                           ))
                           .map(prod => (
                           <button 
                             key={prod.id} 
                             onClick={() => {
                               const existing = cart.find(i => i.product.id === prod.id);
                               if (existing) {
                                 if (existing.quantity >= prod.quantity) return;
                                 setCart(cart.map(i => i.product.id === prod.id ? {...i, quantity: i.quantity + 1} : i));
                               } else {
                                 setCart([...cart, {product: prod, quantity: 1, price: prod.sellingPrice}]);
                               }
                             }}
                             className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-left"
                           >
                             <div className="flex items-center gap-3">
                               <img src={prod.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                               <div>
                                 <div className="text-sm font-bold">{prod.name}</div>
                                 <div className="text-xs text-zinc-500">Sell: {prod.sellingPrice} BDT</div>
                                 {isAdmin && prod.purchasePrice && (
                                   <div className="text-[10px] text-emerald-500/50">Purchase: {prod.purchasePrice} BDT</div>
                                 )}
                               </div>
                             </div>
                             <div className="text-xs font-bold text-emerald-500">
                                {prod.quantity} Left
                             </div>
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Cart & Checkout */}
                   <div className="space-y-6 flex flex-col h-full">
                      <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex-1 flex flex-col">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                           <CreditCard className="w-5 h-5 text-emerald-500" /> Checkout Details
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                           <div className="group">
                             <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1 mb-1 block group-focus-within:text-emerald-500 transition-colors">Customer Name</label>
                             <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                  value={customerInfo.name}
                                  onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                                  placeholder="Full Name"
                                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-500/50"
                                />
                             </div>
                           </div>
                           <div className="group">
                             <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1 mb-1 block group-focus-within:text-emerald-500 transition-colors">Phone Number</label>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                  value={customerInfo.phone}
                                  onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                                  placeholder="+880 1xxx..."
                                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-500/50"
                                />
                             </div>
                           </div>
                        </div>

                         <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] mb-4 pr-1">
                           {cart.length === 0 ? (
                             <div className="h-40 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                                <ShoppingCart className="w-8 h-8 opacity-20 mb-2" />
                                <span className="text-xs">No items in cart</span>
                             </div>
                           ) : (
                             cart.map(item => (
                               <div key={item.product.id} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                                  <div className="flex items-center justify-between">
                                     <div className="flex-1 min-w-0 mr-4">
                                        <div className="text-sm font-bold truncate">{item.product.name}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.product.category}</div>
                                     </div>
                                     <button 
                                       onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))}
                                       className="text-zinc-600 hover:text-red-500 transition-colors"
                                     >
                                       <X className="w-4 h-4" />
                                     </button>
                                  </div>

                                  <div className="flex items-center justify-between gap-4">
                                     <div className="flex-1">
                                        <label className="text-[9px] uppercase font-bold text-zinc-600 mb-1 block">Unit Price (BDT)</label>
                                        <input 
                                          type="number"
                                          value={item.price}
                                          onChange={e => {
                                            const newPrice = parseFloat(e.target.value) || 0;
                                            setCart(cart.map(i => i.product.id === item.product.id ? {...i, price: newPrice} : i));
                                          }}
                                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-emerald-500 font-bold focus:border-emerald-500 outline-none"
                                        />
                                        {isAdmin && item.product.purchasePrice && item.price < item.product.purchasePrice && (
                                          <div className="text-[8px] text-red-500 mt-1 uppercase font-bold tracking-tighter">Below Cost: {item.product.purchasePrice}</div>
                                        )}
                                     </div>

                                     <div>
                                        <label className="text-[9px] uppercase font-bold text-zinc-600 mb-1 block text-center">Qty</label>
                                        <div className="flex items-center bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                                           <button 
                                             onClick={() => {
                                               if (item.quantity > 1) {
                                                 setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: i.quantity - 1} : i));
                                               }
                                             }}
                                             className="p-1 px-2 hover:text-emerald-500 transition-colors border-r border-white/5"
                                           > - </button>
                                           <input 
                                             type="number"
                                             value={item.quantity}
                                             min="1"
                                             max={item.product.quantity}
                                             onChange={e => {
                                               const val = parseInt(e.target.value) || 1;
                                               const finalVal = Math.min(Math.max(1, val), item.product.quantity);
                                               setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: finalVal} : i));
                                             }}
                                             className="w-12 bg-transparent text-xs text-center font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                           />
                                           <button 
                                             onClick={() => {
                                               if (item.quantity < item.product.quantity) {
                                                 setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: i.quantity + 1} : i));
                                               }
                                             }}
                                             className="p-1 px-2 hover:text-emerald-500 transition-colors border-l border-white/5"
                                           > + </button>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                             ))
                           )}
                        </div>

                        <div className="pt-6 border-t border-white/10 mt-auto">
                           <div className="flex items-center justify-between mb-6">
                              <span className="text-zinc-400 font-bold uppercase text-xs">Total Amount</span>
                              <span className="text-2xl font-display font-bold text-emerald-500">
                                 {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()} BDT
                              </span>
                           </div>
                           <button 
                             disabled={cart.length === 0}
                             onClick={handleCreateSale}
                             className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:grayscale"
                           >
                              <CreditCard className="w-5 h-5" />
                              Finalize Sale & Record
                           </button>
                        </div>
                      </div>
                   </div>
                </div>
              ) : adminTab === 'sales-history' ? (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-500">
                      <History className="w-5 h-5" /> Sales History
                   </h3>
                   <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pastSales.map(sale => (
                        <div key={sale.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-emerald-500/30 transition-all group">
                           <div className="flex items-center justify-between mb-4">
                              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                {sale.createdAt?.toDate?.() ? sale.createdAt.toDate().toLocaleDateString() : 'Recent'}
                              </div>
                              <button 
                                onClick={() => setSelectedSale(sale)}
                                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="mb-4">
                              <h4 className="font-bold text-zinc-100 truncate">{sale.customerName || 'Walk-in Customer'}</h4>
                              <div className="flex justify-between items-center mt-1">
                                 <p className="text-xs text-zinc-500">{sale.customerPhone || 'No phone'}</p>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[100px]">{sale.invoiceNo}</span>
                                    {isAdmin && (
                                       <button 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setDeletionTarget(sale);
                                           setShowDeletionModal(true);
                                         }}
                                         className="p-1 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded transition-colors"
                                         title="Request Deletion"
                                       >
                                          <Trash2 className="w-3 h-3" />
                                       </button>
                                    )}
                                 </div>
                              </div>
                           </div>
                           <div className="space-y-1 mb-6 text-xs text-zinc-400">
                              {sale.items.map((item, i) => (
                                <div key={i} className="flex justify-between">
                                   <span>{item.quantity}x {item.name}</span>
                                   <span>{item.price * item.quantity}</span>
                                </div>
                              ))}
                           </div>
                           <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-zinc-500">Total</span>
                              <span className="font-display font-bold text-emerald-500">{sale.total.toLocaleString()} BDT</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ) : adminTab === 'site' ? (
                <form onSubmit={handleUpdateSiteContent} className="space-y-8 pb-8">
                   <div className="space-y-4">
                  <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">Branding</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Logo Text</label>
                      <input 
                        value={editSiteContent.logoText}
                        onChange={e => setEditSiteContent({...editSiteContent, logoText: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Logo Icon (Fallback)</label>
                      <select 
                        value={editSiteContent.logoIcon}
                        onChange={e => setEditSiteContent({...editSiteContent, logoIcon: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                      >
                        <option value="Zap">Zap (Default)</option>
                        <option value="Monitor">Monitor</option>
                        <option value="Globe">Globe</option>
                        <option value="Server">Server</option>
                        <option value="Cpu">Cpu</option>
                        <option value="ShieldCheck">Shield</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs text-zinc-500 mb-1 block">Logo Image</label>
                      <div className="flex gap-2">
                        <div 
                          className="flex-1 bg-white/5 border border-dashed border-white/10 rounded-xl px-4 py-2 text-xs flex items-center justify-between group cursor-pointer hover:border-emerald-500/50 transition-colors"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditSiteContent({...editSiteContent, logoImageUrl: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                        >
                          <span className="text-zinc-500 truncate max-w-[150px]">
                            {editSiteContent.logoImageUrl ? "Image uploaded" : "Click or Paste to upload"}
                          </span>
                          <Upload className="w-4 h-4 text-emerald-500" />
                        </div>
                        {editSiteContent.logoImageUrl && (
                          <button 
                            type="button"
                            onClick={() => setEditSiteContent({...editSiteContent, logoImageUrl: ""})}
                            className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">Why Choose Us Section</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(editSiteContent.features || []).map((feature, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                        <div className="flex gap-2">
                          <input 
                            placeholder="Feature Title"
                            value={feature.title}
                            onChange={e => {
                              const newFeatures = [...editSiteContent.features];
                              newFeatures[idx].title = e.target.value;
                              setEditSiteContent({...editSiteContent, features: newFeatures});
                            }}
                            className="bg-black/20 border border-white/5 rounded-lg px-3 py-1 flex-1 text-sm font-bold"
                          />
                          <select 
                            value={feature.icon}
                            onChange={e => {
                              const newFeatures = [...editSiteContent.features];
                              newFeatures[idx].icon = e.target.value;
                              setEditSiteContent({...editSiteContent, features: newFeatures});
                            }}
                            className="bg-black/20 border border-white/5 rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="Clock">Clock</option>
                            <option value="CheckCircle2">Check</option>
                            <option value="MapPin">Pin</option>
                            <option value="ExternalLink">Link</option>
                            <option value="Zap">Zap</option>
                            <option value="ShieldCheck">Shield</option>
                          </select>
                        </div>
                        <textarea 
                          rows={2}
                          placeholder="Feature Description"
                          value={feature.description}
                          onChange={e => {
                            const newFeatures = [...editSiteContent.features];
                            newFeatures[idx].description = e.target.value;
                            setEditSiteContent({...editSiteContent, features: newFeatures});
                          }}
                          className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Footer & FAQs moved here effectively as before */}
                  <div className="space-y-4">
                    <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">Hero Section</h3>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Badge Text</label>
                      <input 
                        value={editSiteContent.heroBadge}
                        onChange={e => setEditSiteContent({...editSiteContent, heroBadge: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Headline Line 1</label>
                      <input 
                        value={editSiteContent.heroTitleLine1}
                        onChange={e => setEditSiteContent({...editSiteContent, heroTitleLine1: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Headline Line 2 (Green)</label>
                      <input 
                        value={editSiteContent.heroTitleLine2}
                        onChange={e => setEditSiteContent({...editSiteContent, heroTitleLine2: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Hero Subtitle</label>
                      <textarea 
                        rows={3}
                        value={editSiteContent.heroSubtitle}
                        onChange={e => setEditSiteContent({...editSiteContent, heroSubtitle: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                      <div className="space-y-6">
                        <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">Services (Top 3)</h3>
                        {(editSiteContent.services || []).map((service, idx) => (
                           <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="text-[10px] text-zinc-500 mb-1 block">Title</label>
                                  <input 
                                    value={service.title}
                                    onChange={e => {
                                      const newServices = [...editSiteContent.services];
                                      newServices[idx].title = e.target.value;
                                      setEditSiteContent({...editSiteContent, services: newServices});
                                    }}
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="w-24">
                                  <label className="text-[10px] text-zinc-500 mb-1 block">Icon</label>
                                  <select 
                                    value={service.icon}
                                    onChange={e => {
                                      const newServices = [...editSiteContent.services];
                                      newServices[idx].icon = e.target.value;
                                      setEditSiteContent({...editSiteContent, services: newServices});
                                    }}
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 text-sm"
                                  >
                                    <option value="Monitor">Monitor</option>
                                    <option value="Globe">Globe</option>
                                    <option value="Server">Server</option>
                                    <option value="Cpu">Cpu</option>
                                    <option value="ShieldCheck">Shield</option>
                                    <option value="Zap">Zap</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-500 mb-1 block">Description</label>
                                <textarea 
                                  rows={2}
                                  value={service.description}
                                  onChange={e => {
                                    const newServices = [...editSiteContent.services];
                                    newServices[idx].description = e.target.value;
                                    setEditSiteContent({...editSiteContent, services: newServices});
                                  }}
                                  className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 text-sm"
                                />
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">Footer & Contact</h3>
                        <div>
                          <label className="text-xs text-zinc-500 mb-1 block">Footer Description</label>
                          <textarea 
                            rows={2}
                            value={editSiteContent.footerText}
                            onChange={e => setEditSiteContent({...editSiteContent, footerText: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Location</label>
                            <input 
                              value={editSiteContent.contactLocation}
                              onChange={e => setEditSiteContent({...editSiteContent, contactLocation: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Slogan</label>
                            <input 
                              value={editSiteContent.contactSlogan}
                              onChange={e => setEditSiteContent({...editSiteContent, contactSlogan: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Phone</label>
                            <input 
                              value={editSiteContent.contactPhone}
                              onChange={e => setEditSiteContent({...editSiteContent, contactPhone: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">WhatsApp URL</label>
                            <input 
                              value={editSiteContent.contactWhatsApp}
                              onChange={e => setEditSiteContent({...editSiteContent, contactWhatsApp: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                         <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">FAQ Management</h3>
                         <div className="space-y-3">
                            {(editSiteContent.faqs || []).map((faq, idx) => (
                              <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                                 <input 
                                  value={faq.q}
                                  onChange={e => {
                                    const newFaqs = [...editSiteContent.faqs];
                                    newFaqs[idx].q = e.target.value;
                                    setEditSiteContent({...editSiteContent, faqs: newFaqs});
                                  }}
                                  className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-1 text-sm font-bold"
                                  placeholder="Question"
                                 />
                                 <textarea 
                                  rows={2}
                                  value={faq.a}
                                  onChange={e => {
                                    const newFaqs = [...editSiteContent.faqs];
                                    newFaqs[idx].a = e.target.value;
                                    setEditSiteContent({...editSiteContent, faqs: newFaqs});
                                  }}
                                  className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-1 text-xs"
                                  placeholder="Answer"
                                 />
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <button className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                     Save All Site Changes
                   </button>
                </form>
               ) : adminTab === 'staff' ? (
                <div className="max-w-xl mx-auto space-y-12">
                   <div className="space-y-6">
                      <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                         <Plus className="text-emerald-500" /> Add New Staff
                      </h3>
                      <form onSubmit={handleAddAdmin} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                             required
                             type="email"
                             placeholder="Email Address"
                             value={newAdmin.email}
                             onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                             className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                          />
                          <input 
                             required
                             placeholder="Username"
                             value={newAdmin.username}
                             onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                             className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                             required
                             placeholder="Display Name"
                             value={newAdmin.displayName}
                             onChange={e => setNewAdmin({...newAdmin, displayName: e.target.value})}
                             className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                          />
                          <input 
                             required
                             type="password"
                             placeholder="Staff Password"
                             value={newAdmin.password}
                             onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                             className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <button className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg">
                           Finalize & Add Staff Member
                        </button>
                      </form>
                   </div>

                   <div className="space-y-6">
                      <h3 className="text-2xl font-display font-bold">Active Staff Directory Listing</h3>
                      <div className="space-y-4">
                         {adminList.map(admin => (
                           <div key={admin.id} className="p-8 bg-black/40 border border-white/10 rounded-[2.5rem] space-y-8">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <h4 className="font-bold text-xl text-zinc-100 mb-1">{admin.displayName || admin.username}</h4>
                                    <p className="text-sm text-zinc-500">{admin.email} &bull; ID: {admin.id}</p>
                                    {admin.role === 'super' && <span className="inline-block mt-2 text-[8px] bg-emerald-500 text-black px-2 py-0.5 rounded-full uppercase font-black tracking-widest">Master Admin</span>}
                                 </div>
                                 {admin.email && !SUPER_ADMIN_EMAILS.includes(admin.email) && (
                                   <button 
                                      onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                                      className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                   >
                                      <Trash2 className="w-5 h-5" />
                                   </button>
                                 )}
                              </div>

                              <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                                 <div className="space-y-4">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Access Credentials</h5>
                                    <div className="space-y-3">
                                       <div>
                                          <label className="text-[10px] text-zinc-500 block mb-1">Username</label>
                                          <input 
                                            value={admin.username}
                                            onChange={e => handleUpdateAdminProfile(admin.id, {username: e.target.value})}
                                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                                          />
                                       </div>
                                       <div>
                                          <label className="text-[10px] text-zinc-500 block mb-1">Password</label>
                                          <input 
                                            type="password"
                                            value={admin.password}
                                            onChange={e => handleUpdateAdminProfile(admin.id, {password: e.target.value})}
                                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                                          />
                                       </div>
                                    </div>
                                 </div>

                                 <div className="space-y-4">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">System Permissions</h5>
                                     <div className="space-y-3">
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                           type="checkbox"
                                           checked={admin.permissions?.canManageProducts}
                                           onChange={e => handleUpdateAdminProfile(admin.id, {permissions: {...admin.permissions, canManageProducts: e.target.checked}})}
                                           className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                         />
                                         <span className="text-xs text-zinc-400 group-hover:text-zinc-100 transition-colors">Products</span>
                                      </label>
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                           type="checkbox"
                                           checked={admin.permissions?.canManageSales}
                                           onChange={e => handleUpdateAdminProfile(admin.id, {permissions: {...admin.permissions, canManageSales: e.target.checked}})}
                                           className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                         />
                                         <span className="text-xs text-zinc-400 group-hover:text-zinc-100 transition-colors">Sales Tracking</span>
                                      </label>
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                           type="checkbox"
                                           checked={admin.permissions?.canManageSite}
                                           onChange={e => handleUpdateAdminProfile(admin.id, {permissions: {...admin.permissions, canManageSite: e.target.checked}})}
                                           className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                         />
                                         <span className="text-xs text-zinc-400 group-hover:text-zinc-100 transition-colors">Site Content</span>
                                      </label>
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                           type="checkbox"
                                           checked={admin.permissions?.canManageAdmins}
                                           onChange={e => handleUpdateAdminProfile(admin.id, {permissions: {...admin.permissions, canManageAdmins: e.target.checked}})}
                                           className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                         />
                                         <span className="text-xs text-zinc-400 group-hover:text-zinc-100 transition-colors">Admins Management</span>
                                      </label>
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                         <input 
                                           type="checkbox"
                                           checked={admin.permissions?.canManageApprovals}
                                           onChange={e => handleUpdateAdminProfile(admin.id, {permissions: {...admin.permissions, canManageApprovals: e.target.checked}})}
                                           className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                         />
                                         <span className="text-xs text-zinc-400 group-hover:text-zinc-100 transition-colors">Approvals Management</span>
                                      </label>
                                    </div>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 </div>
              ) : adminTab === 'approvals' ? (
                <div className="space-y-12">
                   <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-display font-bold text-white">System Approvals</h3>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Secure multi-admin verification</div>
                   </div>

                   {/* Pending Sales Section */}
                   <div className="space-y-6">
                      <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                         <ShoppingCart className="w-4 h-4" /> Pending Sales
                      </h4>
                      <div className="space-y-4">
                         {pastSales.filter(s => s.status === 'pending').length === 0 ? (
                           <div className="text-center py-12 bg-white/5 border border-white/10 rounded-3xl">
                              <p className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest">No sales awaiting approval</p>
                           </div>
                         ) : (
                           pastSales.filter(s => s.status === 'pending').map(sale => (
                             <div key={sale.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                   <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-zinc-500 font-mono">{sale.invoiceNo}</span>
                                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-tighter rounded">Awaiting Approval</span>
                                   </div>
                                   <h5 className="font-bold text-white">{sale.customerName || 'Walk-in Customer'}</h5>
                                   <div className="text-xs text-zinc-500">
                                      Requested by {sale.staffName} &bull; {sale.total.toLocaleString()} BDT
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   <button 
                                     onClick={() => setSelectedSale(sale)}
                                     className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                                   > View Details </button>
                                   <button 
                                     onClick={() => handleApproveSale(sale)}
                                     className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                                   > Approve Sale </button>
                                </div>
                             </div>
                           ))
                         )}
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2 pt-8 border-t border-white/5">
                         <Trash2 className="w-4 h-4" /> Deletion Requests
                      </h4>
                      <div className="space-y-4">
                         {deletionRequests.filter(r => r.status !== 'executed').length === 0 ? (
                           <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                              <ShieldCheck className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                              <p className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest">No pending requests</p>
                           </div>
                         ) : (
                           deletionRequests.filter(r => r.status !== 'executed').map(req => (
                             <div key={req.id} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-8">
                             <div className="space-y-4 max-w-lg">
                                <div className="flex items-center gap-3">
                                   <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-tighter rounded border border-red-500/20">Sale Deletion Request</span>
                                   <span className="text-[10px] text-zinc-600 font-mono">Invoice: {req.targetId}</span>
                                </div>
                                <div className="min-w-0">
                                   <h4 className="text-lg font-bold text-zinc-100 truncate">Issued by {req.requestedByName}</h4>
                                   <p className="text-sm text-zinc-500 mt-2 italic leading-relaxed">"{req.reason}"</p>
                                </div>
                                <div className="flex items-center gap-6">
                                   <div className="flex -space-x-2">
                                      {(req.approvals || []).length > 0 ? (
                                        req.approvals.map(uid => (
                                          <div key={uid} className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center shadow-lg" title="Approved by admin">
                                             <CheckCircle2 className="w-3 h-3 text-black" />
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Awaiting signatures...</div>
                                      )}
                                   </div>
                                   {req.status === 'approved' && (
                                      <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                         <ShieldCheck className="w-4 h-4" /> Authorized
                                      </div>
                                   )}
                                </div>
                             </div>

                             <div className="flex items-center gap-3">
                                {req.status === 'approved' ? (
                                  <button 
                                    onClick={() => handleExecuteDeletion(req)}
                                    className="px-8 py-3 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                  >
                                     <Zap className="w-4 h-4 fill-current" /> Execute
                                  </button>
                                ) : (
                                  <button 
                                    disabled={req.requestedBy === user?.uid || req.approvals.includes(user?.uid) || !userPermissions?.canManageApprovals}
                                    onClick={() => handleApproveDeletion(req)}
                                    className="px-8 py-3 bg-amber-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all disabled:opacity-20 flex items-center gap-2 shadow-lg shadow-amber-500/20"
                                  >
                                     <ShieldCheck className="w-4 h-4" /> Approve
                                  </button>
                                )}
                                <button 
                                  onClick={async () => {
                                     if(confirm("Permanently reject this request?")) {
                                        await deleteDoc(doc(db, 'deletion_requests', req.id!));
                                     }
                                  }}
                                  className="px-6 py-3 border border-white/10 text-zinc-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                                >
                                   Reject
                                </button>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Deletion Request Modal */}
      <AnimatePresence>
        {showDeletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/20 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl shadow-red-500/10"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">Sensitive Action</h2>
                <p className="text-zinc-500 text-sm mt-1">Deletion requires peer admin approval</p>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                   <p className="text-[10px] uppercase font-black text-zinc-600 mb-1">Target Record</p>
                   <p className="text-sm font-bold text-white">{deletionTarget?.customerName || 'Sale Record'}</p>
                   <p className="text-[10px] font-mono text-zinc-500">{deletionTarget?.invoiceNo}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 block">Reason for deletion</label>
                  <textarea 
                    required
                    value={deletionReason}
                    onChange={e => setDeletionReason(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:border-red-500 outline-none text-sm leading-relaxed"
                    placeholder="Provide a valid reason for this historical record deletion..."
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleRequestDeletion}
                    disabled={!deletionReason}
                    className="flex-1 py-4 bg-red-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-400 transition-all shadow-lg shadow-red-500/20 disabled:opacity-30"
                  >
                    Send Request
                  </button>
                  <button 
                    onClick={() => {
                      setShowDeletionModal(false);
                      setDeletionTarget(null);
                      setDeletionReason('');
                    }}
                    className="px-6 py-4 bg-white/5 text-zinc-400 text-xs font-bold uppercase rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-sm relative"
            >
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full"
              >
                <X />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-2xl font-display font-bold">Welcome Back</h2>
                <p className="text-zinc-500 text-sm mt-1">Access your Grow Mir staff account</p>
              </div>

              <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                <button 
                  onClick={() => { setLoginMethod('google'); setIsSignUpMode(false); }}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${loginMethod === 'google' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
                >
                  Google
                </button>
                <button 
                  onClick={() => setLoginMethod('staff')}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${loginMethod === 'staff' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
                >
                  Email / Password
                </button>
              </div>

              {loginMethod === 'google' ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => { handleLogin(); setShowLoginModal(false); }}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                    Continue with Google
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest leading-relaxed">
                    Fastest way to access your account using your Google ID
                  </p>
                </div>
              ) : (
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  {isSignUpMode && (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Display Name</label>
                      <input 
                        required
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none text-white"
                        placeholder="John Doe"
                        value={staffLogin.displayName}
                        onChange={e => setStaffLogin({...staffLogin, displayName: e.target.value})}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none text-white"
                      placeholder="staff@example.com"
                      value={staffLogin.email}
                      onChange={e => setStaffLogin({...staffLogin, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Password</label>
                    <input 
                      required
                      type="password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none text-white"
                      placeholder="••••••••"
                      value={staffLogin.password}
                      onChange={e => setStaffLogin({...staffLogin, password: e.target.value})}
                    />
                  </div>
                  <button 
                    disabled={isLoggingIn}
                    className="w-full bg-emerald-500 text-black font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {isLoggingIn ? 'Processing...' : (isSignUpMode ? 'Create Account' : 'Sign In')}
                  </button>
                  
                  <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsSignUpMode(!isSignUpMode)}
                      className="text-xs text-zinc-400 hover:text-emerald-500 transition-colors"
                    >
                      {isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-white/10 p-8 rounded-[3rem] w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-full text-zinc-400"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-10 mt-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <Globe className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-4xl font-display font-bold tracking-tight">Host Your Service</h2>
                <p className="text-zinc-500 mt-2 max-w-xs mx-auto">Access and share your GMC Service app anywhere.</p>
              </div>

              <div className="space-y-8">
                <div className="flex flex-col items-center gap-4 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                  <div className="p-4 bg-white rounded-3xl shadow-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(APP_URLS.shared)}&color=000000&bgcolor=FFFFFF&format=png&margin=1`} 
                      alt="QR Code" 
                      className="w-32 h-32"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Scan to Login</p>
                    <p className="text-[10px] text-zinc-600">Open on your phone instantly</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="group relative">
                    <label className="text-[10px] font-black uppercase text-zinc-600 mb-2 ml-1 block">Shared App URL (Public)</label>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={APP_URLS.shared}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono text-zinc-400 group-hover:text-emerald-400 transition-colors outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(APP_URLS.shared);
                          alert("URL copied to clipboard!");
                        }}
                        className="px-6 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-emerald-400 transition-all active:scale-95"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                     <p className="text-xs text-emerald-400/80 leading-relaxed italic">
                        "You don't need external hosting. The link above is your permanent, live application. Share it with your staff or open it on any browser to login."
                     </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedSale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white text-black w-full max-w-2xl font-sans rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
               {/* Invoice Header */}
               <div className="p-8 border-b border-zinc-100 bg-zinc-50 flex justify-between items-start print:hidden">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                       <Printer className="w-6 h-6 text-emerald-600" />
                       Sale Invoice
                    </h2>
                    <p className="text-zinc-500 text-sm">Invoice ID: {selectedSale.invoiceNo}</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handlePrintInvoice}
                      className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all"
                    >
                       <Plus className="w-4 h-4 rotate-45" /> Print
                    </button>
                    <button 
                      onClick={() => setSelectedSale(null)}
                      className="p-2 hover:bg-zinc-200 rounded-full transition-all"
                    >
                       <X />
                    </button>
                  </div>
               </div>

               {/* Printable Area */}
               <div id="printable-invoice" className="flex-1 overflow-y-auto p-12 print:p-0 bg-white">
                  <div className="max-w-2xl mx-auto space-y-12">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="text-3xl font-black tracking-tighter mb-2 italic">GROW MIR</div>
                           <div className="text-xs text-zinc-500 uppercase font-black tracking-widest mb-4">Computer Service</div>
                           <div className="text-sm space-y-1">
                              <p>{siteContent.contactLocation}</p>
                              <p>Phone: {siteContent.contactPhone}</p>
                              <p>WhatsApp: 8801851118215</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <h1 className="text-5xl font-black text-zinc-200 uppercase print:text-zinc-400">Invoice</h1>
                           <div className="mt-4 text-sm space-y-1">
                              <p className="font-bold">Date: {selectedSale.createdAt?.toDate?.() ? selectedSale.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</p>
                              <p>Invoice #: {selectedSale.invoiceNo}</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-12 border-y border-zinc-100 py-8">
                        <div>
                           <div className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Billed To</div>
                           <div className="font-bold text-lg">{selectedSale.customerName || 'Walk-in Customer'}</div>
                           <div className="text-zinc-500">{selectedSale.customerPhone || 'N/A'}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Sold By</div>
                           <div className="font-bold">{selectedSale.staffName || selectedSale.staffEmail}</div>
                        </div>
                     </div>

                     <table className="w-full text-left">
                        <thead>
                           <tr className="border-b-2 border-zinc-900 text-[10px] uppercase font-bold text-zinc-400">
                              <th className="py-4">Description</th>
                              <th className="py-4 text-center">Qty</th>
                              <th className="py-4 text-right">Price</th>
                              <th className="py-4 text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                           {selectedSale.items.map((item, i) => (
                             <tr key={i} className="text-sm">
                                <td className="py-4 font-bold">{item.name}</td>
                                <td className="py-4 text-center">{item.quantity}</td>
                                <td className="py-4 text-right">{item.price.toLocaleString()}</td>
                                <td className="py-4 text-right font-bold">{(item.price * item.quantity).toLocaleString()}</td>
                             </tr>
                           ))}
                        </tbody>
                     </table>

                     <div className="flex justify-end pt-8">
                        <div className="w-64 space-y-4">
                           <div className="flex justify-between text-zinc-500 uppercase text-[10px] font-bold">
                              <span>Subtotal</span>
                              <span>{selectedSale.total.toLocaleString()} BDT</span>
                           </div>
                           <div className="flex justify-between text-zinc-500 uppercase text-[10px] font-bold">
                              <span>Tax (0%)</span>
                              <span>0.00 BDT</span>
                           </div>
                           <div className="flex justify-between items-center pt-4 border-t-2 border-black">
                              <span className="text-xs font-bold uppercase">Total</span>
                              <span className="text-2xl font-black">{selectedSale.total.toLocaleString()} BDT</span>
                           </div>
                        </div>
                     </div>

                     <div className="pt-24 text-center space-y-6">
                        <div className="text-xs text-zinc-400 italic">"Always on your service"</div>
                        <div className="flex justify-around items-end pt-12">
                           <div className="w-40 border-t border-zinc-300 pt-2 text-[10px] uppercase font-bold text-zinc-400">Customer Signature</div>
                           <div className="w-40 border-t border-emerald-500 pt-2 text-[10px] uppercase font-bold text-emerald-500">Authorized Signature</div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {siteContent.heroBadge}
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter mb-8 leading-tight">
              {siteContent.heroTitleLine1} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 font-black">{siteContent.heroTitleLine2}</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-zinc-400 text-lg md:text-xl mb-12 leading-relaxed">
              {siteContent.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://wa.me/8801851118215" 
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-black font-bold rounded-full hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 group"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp Message
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#products" 
                className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-white font-bold rounded-full flex items-center justify-center gap-2"
              >
                Explore Shop
              </a>
            </div>
          </motion.div>
        </div>

        {/* Floating elements background decoration */}
        <div className="hidden lg:block absolute top-80 -left-20 w-64 h-64 border border-emerald-500/10 rounded-full rotate-12" />
        <div className="hidden lg:block absolute bottom-20 -right-20 w-96 h-96 border border-emerald-500/10 rounded-full -rotate-12" />
      </section>

      {/* Shop/Products Section */}
      <section id="products" className="py-24 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-baseline justify-between mb-16 gap-4">
             <div className="flex items-center gap-4">
                <Tag className="text-emerald-500 w-8 h-8" />
                <h2 className="text-4xl md:text-5xl font-display font-bold">Premium Products</h2>
             </div>

          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence>
              {products.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-900 rounded-[2rem]">
                  <Package className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-700 font-bold">Our catalog is currently being updated.</p>
                  {isAdmin && (
                    <button 
                      onClick={() => setShowAdminPanel(true)}
                      className="mt-4 text-emerald-500 underline underline-offset-4"
                    >
                      Add products now
                    </button>
                  )}
                </div>
              ) : (
                products.map((prod, index) => (
                  <motion.div
                    key={prod.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-[#0a0a0a] border border-emerald-900/10 rounded-[2rem] overflow-hidden hover:border-emerald-500/30 transition-all flex flex-col"
                  >
                    <div className="aspect-square relative overflow-hidden">
                       <img 
                        src={prod.imageUrl} 
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                       />
                       <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <div className="bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start shadow-lg shadow-black/20">
                            {prod.category}
                          </div>
                          <div className="bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start shadow-lg shadow-black/20">
                            {prod.brand}
                          </div>
                       </div>
                       {prod.quantity === 0 && (
                         <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl">Out of Stock</span>
                         </div>
                       )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                       <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">{prod.name}</h3>
                       <p className="text-zinc-500 text-sm mb-4 line-clamp-2">
                        {prod.description}
                       </p>
                       <div className="flex items-center justify-between mt-auto pt-4 border-t border-emerald-900/10">
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-tighter mb-1">Price</div>
                            <span className="text-emerald-500 font-bold font-display text-lg">{(prod.sellingPrice || 0).toLocaleString()} BDT</span>
                          </div>
                          <div className="text-right">
                             <div className="text-xs text-zinc-500 uppercase font-bold tracking-tighter mb-1">Stock</div>
                             <span className={`text-xs font-bold ${prod.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                               {prod.quantity > 0 ? `${prod.quantity} Units` : 'Sold Out'}
                             </span>
                          </div>
                       </div>
                       <div className="mt-2 flex flex-wrap gap-2">
                          {prod.hasWarranty && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                               {prod.warrantyDuration ? `Warranty: ${prod.warrantyDuration}` : 'Warranty Included'}
                            </span>
                          )}
                          {prod.serialNumber && (
                            <span className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-white/5 font-mono">SN: {prod.serialNumber}</span>
                          )}
                       </div>
                       <div className="mt-4 pt-4 flex gap-2">
                          <a 
                            href={`https://wa.me/8801851118215?text=I'm interested in ${prod.name} (${prod.brand})`}
                            className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Order Now
                          </a>
                       </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-24 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-display font-bold mb-4">Expert IT Solutions</h2>
              <p className="text-zinc-400 max-w-md">Professional technical assistance for home and business environments.</p>
            </div>
            <div className="text-sm font-display text-emerald-500 font-bold uppercase tracking-widest">
              Available &bull; 24/7 Support
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(siteContent.services || []).map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group p-8 bg-[#0a0a0a] border border-emerald-900/20 rounded-3xl hover:border-emerald-500/50 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    {getIconComponent(service.icon)}
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4 group-hover:text-emerald-400 transition-colors">{service.title}</h3>
                  <p className="text-zinc-400 mb-8 leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="space-y-3">
                    {(service.details || []).map((detail: string) => (
                      <li key={detail} className="flex items-center gap-3 text-sm text-zinc-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Share Button for Mobile/Quick Access */}
      <button
        onClick={() => setShowShareModal(true)}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-emerald-500 text-black rounded-2xl shadow-2xl flex items-center justify-center hover:bg-emerald-400 transition-all active:scale-95 md:scale-100"
        title="Share & Hosting"
      >
        <Globe className="w-6 h-6" />
      </button>

      {/* Why Choose Us */}
      <section className="py-24 bg-[#080808] border-y border-emerald-900/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">Why Choose {siteContent.logoText}?</h2>
            <p className="text-zinc-400">Local expertise meets professional standards.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {(siteContent.features || []).map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-[#0a0a0a] border border-emerald-900/5 hover:border-emerald-500/20 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 mx-auto text-emerald-500">
                  {getIconComponent(item.icon, "w-6 h-6")}
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-display font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {(siteContent.faqs || []).map((faq, i) => (
              <details key={i} className="group bg-[#0a0a0a] border border-emerald-900/10 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">{faq.q}</span>
                  <ChevronRight className="w-5 h-5 text-emerald-500 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="pt-24 pb-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center overflow-hidden">
                  {siteContent.logoImageUrl ? (
                    <img src={siteContent.logoImageUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    getIconComponent(siteContent.logoIcon, "text-black w-5 h-5 fill-black")
                  )}
                </div>
                <span className="font-display font-bold text-xl tracking-tight uppercase">
                  {siteContent.logoText}
                </span>
              </div>
              <p className="text-zinc-500 max-w-sm mb-8">
                {siteContent.footerText}
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href={siteContent.contactWhatsApp} 
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href={`tel:${siteContent.contactPhone.replace(/[^0-9+]/g, '')}`} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all">
                  <Phone className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-emerald-400 uppercase text-xs tracking-tighter">Locate Us</h4>
              <div className="space-y-4">
                 <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-zinc-500 text-sm">{siteContent.contactLocation}</span>
                 </div>
                 <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-zinc-500 text-sm italic">{siteContent.contactSlogan}</span>
                 </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-emerald-400 uppercase text-xs tracking-tighter">Quick Connect</h4>
              <div className="space-y-4 text-sm">
                <a href={`tel:${siteContent.contactPhone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-3 text-zinc-500 hover:text-emerald-400 transition-colors">
                  <Phone className="w-4 h-4" />
                  {siteContent.contactPhone}
                </a>
                <a href={siteContent.contactWhatsApp} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-emerald-400 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-emerald-900/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-zinc-600">
            <div>
              &copy; {new Date().getFullYear()} GMC Service - Grow Mir Computer Service. All Rights Reserved.
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-emerald-500">Security Policy</a>
              <a href="#" className="hover:text-emerald-500">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
