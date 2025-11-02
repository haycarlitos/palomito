"use client";

import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, usePublicClient, useReadContract } from "wagmi";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { showSuccessToast, showErrorToast } from "@/components/ui/custom-toast";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useLanguage } from "@/contexts/language-context";
import { getTranslations } from "@/lib/translations";
import { useDebounce } from "@/hooks/use-debounce";
import { parseUnits, formatUnits, toHex } from "viem";
import { useChainId, useSwitchChain } from "wagmi";
import { scroll } from "viem/chains";
import { INSURANCE_CONTRACT_ADDRESS, INSURANCE_CONTRACT_ABI, USDC_ADDRESSES, ERC20_ABI } from "@/lib/constants";

interface CodeResponse {
  success: boolean;
  code?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  originalTicketPrice?: number;
  originalPremium?: number;
  discountedPremium?: number;
  finalPremium?: number;
  remainingUses?: number | null;
  expiresAt?: string;
  message?: string;
  error?: string;
}

interface FlightStatus {
  exists: boolean;
  airline?: string;
  airlineIata?: string;
  flightNumber?: string;
  date?: string;
  status?: string;
  rawStatus?: string;
  departure?: {
    airport: string;
    airportIata: string;
    city: string;
    scheduledTimeLocal: string | null;
    terminal: string | null;
  };
  arrival?: {
    airport: string;
    airportIata: string;
    city: string;
    scheduledTimeLocal: string | null;
    terminal: string | null;
  };
  aircraft?: string | null;
}

// Common Mexican and international airports
const AIRPORTS = [
  { code: "MEX", name: "Ciudad de México (MEX)" },
  { code: "MTY", name: "Monterrey (MTY)" },
  { code: "CUN", name: "Cancún (CUN)" },
  { code: "GDL", name: "Guadalajara (GDL)" },
  { code: "TIJ", name: "Tijuana (TIJ)" },
  { code: "BJX", name: "León/Guanajuato (BJX)" },
  { code: "QRO", name: "Querétaro (QRO)" },
  { code: "HMO", name: "Hermosillo (HMO)" },
  { code: "CUU", name: "Chihuahua (CUU)" },
  { code: "VSA", name: "Villahermosa (VSA)" },
  { code: "MTT", name: "Minatitlán (MTT)" },
  { code: "PBC", name: "Puebla (PBC)" },
  { code: "MZT", name: "Mazatlán (MZT)" },
  { code: "ZCL", name: "Zacatecas (ZCL)" },
  { code: "ACA", name: "Acapulco (ACA)" },
  { code: "GUA", name: "Guatemala (GUA)" },
  { code: "SJO", name: "San José, Costa Rica (SJO)" },
  { code: "PTY", name: "Panamá (PTY)" },
  { code: "BOG", name: "Bogotá (BOG)" },
  { code: "LIM", name: "Lima (LIM)" },
  { code: "SCL", name: "Santiago (SCL)" },
  { code: "MIA", name: "Miami (MIA)" },
  { code: "IAH", name: "Houston (IAH)" },
  { code: "DFW", name: "Dallas (DFW)" },
  { code: "ATL", name: "Atlanta (ATL)" },
  { code: "LAX", name: "Los Angeles (LAX)" },
  { code: "JFK", name: "New York JFK (JFK)" },
  { code: "ORD", name: "Chicago (ORD)" },
];

export default function BuyPolicy() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  // Force Scroll as the default chain (534352)
  const targetChainId = scroll.id;
  // Don't constrain walletClient to a specific chain - it should work on any chain
  // We'll switch to the target chain when needed
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: targetChainId });
  const router = useRouter();
  const { language } = useLanguage();
  
  // Get the active wallet from Privy
  const wallet = wallets[0];
  
  // All hooks must be called before any early returns
  const [formData, setFormData] = useState({
    airline: "",
    flightNumber: "",
    date: "",
    departureAirport: "",
    ticketPrice: "",
  });
  const [promoCode, setPromoCode] = useState("");
  const [codeResponse, setCodeResponse] = useState<CodeResponse | null>(null);
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  
  // Flight validation state
  const [flightStatus, setFlightStatus] = useState<FlightStatus | null>(null);
  const [isValidatingFlight, setIsValidatingFlight] = useState(false);
  const [flightValidationError, setFlightValidationError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [createdPolicy, setCreatedPolicy] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  
  // Get USDC address for Scroll chain (default)
  const usdcAddress = USDC_ADDRESSES[targetChainId as keyof typeof USDC_ADDRESSES] || null;
  
  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  });
  
  // Get USDC decimals
  const { data: usdcDecimals } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!usdcAddress,
    },
  });
  
  // Get USDC address from contract (more reliable) - using Scroll chain
  const { data: contractUsdcAddress } = useReadContract({
    address: INSURANCE_CONTRACT_ADDRESS,
    abi: INSURANCE_CONTRACT_ABI,
    functionName: "USDC",
    chainId: targetChainId,
    query: {
      enabled: !!address && authenticated,
    },
  });
  
  // Use contract's USDC address if available, otherwise use our mapping
  const tokenAddress = (contractUsdcAddress as `0x${string}`) || usdcAddress;
  
  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address: tokenAddress || undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && tokenAddress ? [address, INSURANCE_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  // Debounce flight validation inputs
  const debouncedAirline = useDebounce(formData.airline, 300);
  const debouncedFlightNumber = useDebounce(formData.flightNumber, 500);
  const debouncedDate = useDebounce(formData.date, 300);
  const debouncedDepartureAirport = useDebounce(formData.departureAirport, 300);

  // Calculate premium early (needed for useEffect hooks)
  const ticketPriceNum = parseFloat(formData.ticketPrice) || 0;
  const basePremium = ticketPriceNum * 0.05;
  const premiumRaw = codeResponse?.success && codeResponse.finalPremium !== undefined
    ? codeResponse.finalPremium
    : basePremium;
  // Ensure premium is always a number (convert BigInt if needed)
  const premium = typeof premiumRaw === 'bigint' ? Number(premiumRaw) : Number(premiumRaw);
  
  // Helper function to safely format premium (ensures it's always a number)
  const formatPremium = (value: number | bigint): string => {
    const numValue = typeof value === 'bigint' ? Number(value) : value;
    return numValue.toFixed(2);
  };

  // Ensure we have a valid language
  const validLanguage: "es" | "en" = language === "es" || language === "en" ? language : "es";
  const t = getTranslations(validLanguage);

  // Safety: use optional chaining and provide fallbacks
  const buyT = t.buy || {
    title: validLanguage === "es" ? "Comprar Cobertura" : "Buy Coverage",
    subtitle: validLanguage === "es" ? "Ingresa los datos de tu vuelo para obtener una cotización instantánea" : "Enter your flight details to get an instant quote",
    formTitle: validLanguage === "es" ? "Datos del Vuelo" : "Flight Details",
    fields: {
      airline: validLanguage === "es" ? "Aerolínea" : "Airline",
      selectAirline: validLanguage === "es" ? "Selecciona una aerolínea" : "Select an airline",
      flightNumber: validLanguage === "es" ? "Número de Vuelo" : "Flight Number",
      date: validLanguage === "es" ? "Fecha del Vuelo" : "Flight Date",
      departureAirport: validLanguage === "es" ? "Aeropuerto de Salida (IATA)" : "Departure Airport (IATA)",
      selectDepartureAirport: validLanguage === "es" ? "Selecciona el aeropuerto de salida" : "Select departure airport",
      ticketPrice: validLanguage === "es" ? "Precio del Boleto (USD)" : "Ticket Price (USD)",
      promoCode: validLanguage === "es" ? "Código Promocional / Cupón" : "Promo Code / Voucher",
    },
    promoCode: {
      placeholder: validLanguage === "es" ? "Ingresa tu código" : "Enter your code",
      apply: validLanguage === "es" ? "Aplicar" : "Apply",
      applying: validLanguage === "es" ? "Aplicando..." : "Applying...",
      remove: validLanguage === "es" ? "Remover" : "Remove",
      applied: validLanguage === "es" ? "Código {code} aplicado" : "Code {code} applied",
      remainingUses: validLanguage === "es" ? "Usos restantes: {count}" : "Remaining uses: {count}",
      expires: validLanguage === "es" ? "Expira: {date}" : "Expires: {date}",
      appliedLabel: validLanguage === "es" ? "Código aplicado:" : "Code applied:",
      discount: validLanguage === "es" ? "Descuento: {value}%" : "Discount: {value}%",
    },
    quote: {
      title: validLanguage === "es" ? "Tu Cotización" : "Your Quote",
      ticketPrice: validLanguage === "es" ? "Precio del Boleto:" : "Ticket Price:",
      originalPremium: validLanguage === "es" ? "Prima Original (5%):" : "Original Premium (5%):",
      premium: validLanguage === "es" ? "Prima (5%):" : "Premium (5%):",
      discount: validLanguage === "es" ? "Descuento:" : "Discount:",
      finalPremium: validLanguage === "es" ? "Prima Final:" : "Final Premium:",
      totalCoverage: validLanguage === "es" ? "Cobertura Total:" : "Total Coverage:",
      noQuote: validLanguage === "es" ? "Ingresa los datos de tu vuelo para ver la cotización" : "Enter your flight details to see the quote",
    },
    coverage: {
      title: validLanguage === "es" ? "Qué Cubre:" : "What's Covered:",
      items: validLanguage === "es" 
        ? ["Cancelación de vuelo", "Pago automático al verificar"]
        : ["Flight cancellation", "Automatic payment on verification"],
    },
    terms: {
      title: validLanguage === "es" ? "Términos:" : "Terms:",
      description: validLanguage === "es" 
        ? "Al continuar, aceptas los términos y condiciones de Palomito. La cobertura es válida hasta la fecha de tu vuelo."
        : "By continuing, you accept Palomito's terms and conditions. Coverage is valid until your flight date.",
      accept: validLanguage === "es" ? "Acepto los términos y condiciones" : "I accept the terms and conditions",
    },
    buttons: {
      continue: validLanguage === "es" ? "Continuar" : "Continue",
    },
    toast: {
      enterCode: validLanguage === "es" ? "Por favor ingresa un código promocional" : "Please enter a promo code",
      enterTicketPrice: validLanguage === "es" ? "Por favor ingresa un precio de boleto válido primero" : "Please enter a valid ticket price first",
      codeApplied: validLanguage === "es" ? "¡Código aplicado exitosamente!" : "Code applied successfully!",
      codeError: validLanguage === "es" ? "Error al aplicar el código. Por favor intenta de nuevo." : "Error applying code. Please try again.",
      loginRequired: validLanguage === "es" ? "Por favor inicia sesión para continuar" : "Please log in to continue",
      policyCreated: validLanguage === "es" ? "Póliza creada exitosamente" : "Policy created successfully",
      flightNotFound: validLanguage === "es" ? "El vuelo no fue encontrado. Por favor verifica los datos." : "Flight not found. Please verify the details.",
      flightValidationError: validLanguage === "es" ? "Error al validar el vuelo. Por favor intenta de nuevo." : "Error validating flight. Please try again.",
      validateFlightFirst: validLanguage === "es" ? "Por favor verifica que el vuelo existe antes de continuar." : "Please verify the flight exists before continuing.",
      insufficientFunds: validLanguage === "es" ? "Fondos insuficientes. Necesitas al menos {amount} USDC para pagar la prima." : "Insufficient funds. You need at least {amount} USDC to pay the premium.",
      paymentProcessing: validLanguage === "es" ? "Procesando pago..." : "Processing payment...",
      paymentSuccess: validLanguage === "es" ? "Pago exitoso" : "Payment successful",
      paymentError: validLanguage === "es" ? "Error al procesar el pago" : "Error processing payment",
    },
    flightValidation: {
      validating: validLanguage === "es" ? "Validando vuelo..." : "Validating flight...",
      valid: validLanguage === "es" ? "Vuelo verificado ✓" : "Flight verified ✓",
      invalid: validLanguage === "es" ? "Vuelo no encontrado" : "Flight not found",
      route: validLanguage === "es" ? "Ruta" : "Route",
      status: validLanguage === "es" ? "Estado" : "Status",
      departureTime: validLanguage === "es" ? "Hora de salida" : "Departure time",
      arrivalTime: validLanguage === "es" ? "Hora de llegada" : "Arrival time",
    },
  };

  // Redirect to home if not authenticated and show loading while checking
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Set active wallet when wallets are available
  useEffect(() => {
    if (wallets.length > 0 && !address) {
      setActiveWallet(wallets[0]);
    }
  }, [wallets, address, setActiveWallet]);

  // Automatically switch to Scroll when authenticated
  useEffect(() => {
    if (authenticated && ready && address && wallet && chainId !== targetChainId) {
      console.log("Auto-switching to Scroll chain", { current: chainId, target: targetChainId });
      const switchToScroll = async () => {
        try {
          // Call switchChain - it may throw synchronously
          switchChain({ chainId: targetChainId });
        } catch (error) {
          console.error("Error auto-switching to Scroll:", error);
          // If switchChain fails, try using wallet.switchChain
          if (wallet.switchChain) {
            wallet.switchChain(targetChainId).catch((err) => {
              console.error("Error switching chain via wallet:", err);
            });
          }
        }
      };
      switchToScroll();
    }
  }, [authenticated, ready, address, wallet, chainId, targetChainId, switchChain]);

  // Check allowance when premium changes
  useEffect(() => {
    const checkAllowance = async () => {
      if (!publicClient || !address || !tokenAddress || !ticketPriceNum) return;

      try {
      // Ensure decimals is a number (usdcDecimals might be BigInt)
      let decimals: number;
      if (typeof usdcDecimals === 'bigint') {
        decimals = Number(usdcDecimals);
      } else if (typeof usdcDecimals === 'number') {
        decimals = usdcDecimals;
      } else {
        decimals = 6; // Default to 6 decimals for USDC
      }
      // USD to USDC: 1 USD = 1 USDC (same value, different decimals)
      // Ensure premium is a number (not BigInt)
      const premiumNum = typeof premium === 'bigint' ? Number(premium) : Number(premium);
      const premiumInUsdc = premiumNum; // Already in USD
      const premiumInWei = parseUnits(premiumInUsdc.toFixed(decimals), decimals);

        if (allowance && typeof allowance === 'bigint') {
          setIsApproved(allowance >= premiumInWei);
        }
      } catch (error) {
        console.error("Error checking allowance:", error);
      }
    };

    checkAllowance();
  }, [publicClient, address, tokenAddress, allowance, premium, usdcDecimals, ticketPriceNum]);

  // Flight validation effect
  useEffect(() => {
    const validateFlight = async () => {
      // Reset state
      setFlightStatus(null);
      setFlightValidationError(null);

      // Check if all required fields are filled
      if (!debouncedAirline || !debouncedFlightNumber || !debouncedDate || !debouncedDepartureAirport) {
        return;
      }

      // Don't validate if date is in the past
      const selectedDate = new Date(debouncedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setFlightValidationError(validLanguage === "es" ? "La fecha no puede ser en el pasado" : "Date cannot be in the past");
        return;
      }

      setIsValidatingFlight(true);

      try {
        const params = new URLSearchParams({
          airline: debouncedAirline,
          flightNumber: debouncedFlightNumber,
          date: debouncedDate,
          departureAirport: debouncedDepartureAirport,
        });

        const response = await fetch(`/api/flight-status?${params.toString()}`);
        const data = await response.json();

        if (response.ok && data.flightStatus?.exists) {
          setFlightStatus(data.flightStatus);
          setFlightValidationError(null);
        } else {
          setFlightStatus({ exists: false });
          setFlightValidationError(data.error || data.message || buyT.toast.flightNotFound);
        }
      } catch (error) {
        console.error("Error validating flight:", error);
        setFlightStatus({ exists: false });
        setFlightValidationError(buyT.toast.flightValidationError);
      } finally {
        setIsValidatingFlight(false);
      }
    };

    validateFlight();
  }, [debouncedAirline, debouncedFlightNumber, debouncedDate, debouncedDepartureAirport, validLanguage, buyT.toast.flightNotFound, buyT.toast.flightValidationError]);

  // Show loading state while checking authentication or if not ready
  if (!ready || (ready && !authenticated)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600">
            {validLanguage === "es" ? "Cargando..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Additional calculations for display
  const coverage = ticketPriceNum;
  const discountAmount = codeResponse?.discountAmount || 0;
  const originalPremium = codeResponse?.originalPremium || basePremium;

  const handleApplyCode = async () => {
    if (!promoCode.trim()) {
      showErrorToast(buyT.toast.enterCode);
      return;
    }

    if (!ticketPriceNum || ticketPriceNum <= 0) {
      showErrorToast(buyT.toast.enterTicketPrice);
      return;
    }

    setIsApplyingCode(true);
    try {
      const response = await fetch("/api/apply-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: promoCode.trim().toUpperCase(),
          ticketPrice: ticketPriceNum,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCodeResponse(data);
        setAppliedCode(data.code);
        showSuccessToast(data.message || buyT.toast.codeApplied);
      } else {
        setCodeResponse(data);
        setAppliedCode(null);
        showErrorToast(data.message || data.error || buyT.toast.codeError);
      }
    } catch (error) {
      console.error("Error applying code:", error);
      showErrorToast(buyT.toast.codeError);
      setCodeResponse(null);
      setAppliedCode(null);
    } finally {
      setIsApplyingCode(false);
    }
  };

  const handleRemoveCode = () => {
    setPromoCode("");
    setCodeResponse(null);
    setAppliedCode(null);
  };

  const handleApproveTokens = async () => {
    console.log("handleApproveTokens called", { wallet: !!wallet, address, walletClient: !!walletClient, publicClient: !!publicClient, tokenAddress, chainId });
    
    if (!wallet || !address) {
      const errorMsg = validLanguage === "es" ? "Por favor conecta tu billetera" : "Please connect your wallet";
      console.error("Missing wallet or address:", { wallet: !!wallet, address });
      showErrorToast(errorMsg);
      return;
    }

    // Ensure wallet is set as active
    if (wallets.length > 0 && wallets[0]) {
      try {
        await setActiveWallet(wallets[0]);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.warn("Error setting active wallet:", error);
      }
    }

    // FORCE switch to Scroll chain before proceeding
    const walletChainId = typeof wallet.chainId === 'string' && wallet.chainId.startsWith('eip155:')
      ? parseInt(wallet.chainId.split(':')[1])
      : wallet.chainId;
    
    if (chainId !== targetChainId || walletChainId !== targetChainId) {
      console.log("Force switching to Scroll chain before approval", { current: chainId || walletChainId, target: targetChainId });
      try {
        if (switchChain) {
          await switchChain({ chainId: targetChainId });
        } else if (wallet.switchChain) {
          await wallet.switchChain(targetChainId);
        } else {
          throw new Error("No method available to switch chain");
        }
        // Wait for chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify we're on Scroll now
        const newChainId = typeof wallet.chainId === 'string' && wallet.chainId.startsWith('eip155:')
          ? parseInt(wallet.chainId.split(':')[1])
          : wallet.chainId;
        if (newChainId !== targetChainId) {
          throw new Error(`Failed to switch to Scroll chain. Still on chain ${newChainId}`);
        }
        console.log("Successfully switched to Scroll chain");
      } catch (switchError: any) {
        console.error("Error switching to Scroll chain:", switchError);
        showErrorToast(validLanguage === "es" 
          ? "Error al cambiar a la red Scroll. Por favor cambia manualmente a Scroll (Chain ID: 534352)." 
          : "Error switching to Scroll network. Please switch manually to Scroll (Chain ID: 534352).");
        return;
      }
    }

    if (!walletClient) {
      // Wait a moment for wallet client to initialize after chain switch
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!walletClient) {
        const errorMsg = validLanguage === "es" ? "Cliente de billetera no disponible. Por favor intenta recargar la página." : "Wallet client not available. Please try refreshing the page.";
        console.error("Missing walletClient after wait");
        showErrorToast(errorMsg);
        return;
      }
    }

    if (!publicClient) {
      const errorMsg = validLanguage === "es" ? "Cliente público no disponible. Por favor intenta recargar la página." : "Public client not available. Please try refreshing the page.";
      console.error("Missing publicClient");
      showErrorToast(errorMsg);
      return;
    }

    if (!tokenAddress) {
      const errorMsg = validLanguage === "es" ? `Dirección de token no disponible para la red ${chainId}. Por favor verifica tu conexión.` : `Token address not available for chain ${chainId}. Please check your connection.`;
      console.error("Missing tokenAddress:", { chainId, usdcAddress, contractUsdcAddress });
      showErrorToast(errorMsg);
      return;
    }

    setIsProcessingPayment(true);
    try {
      console.log("Starting approval process", { premiumInUsdc: premium, tokenAddress, currentChainId: chainId, targetChainId });
      // Note: Chain switch was already handled above, so we should be on Scroll now

      // Ensure decimals is a number (usdcDecimals might be BigInt)
      let decimals: number;
      if (typeof usdcDecimals === 'bigint') {
        decimals = Number(usdcDecimals);
      } else if (typeof usdcDecimals === 'number') {
        decimals = usdcDecimals;
      } else {
        decimals = 6; // Default to 6 decimals for USDC
      }
      // USD to USDC: 1 USD = 1 USDC (same value, different decimals)
      // Ensure premium is a number (not BigInt)
      const premiumNum = typeof premium === 'bigint' ? Number(premium) : Number(premium);
      const premiumInUsdc = premiumNum; // Already in USD
      const premiumInWei = parseUnits(premiumInUsdc.toFixed(decimals), decimals);

      // Check token balance on Scroll
      console.log("Checking token balance", { tokenAddress, address, chainId: targetChainId });
      const tokenBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as bigint;
      console.log("Token balance:", tokenBalance.toString(), "Required:", premiumInWei.toString());
      console.log("Balance comparison:", { tokenBalance: tokenBalance.toString(), premiumInWei: premiumInWei.toString(), lessThan: tokenBalance < premiumInWei });

      if (tokenBalance < premiumInWei) {
        console.error("Insufficient funds detected", { balance: tokenBalance.toString(), required: premiumInWei.toString(), chainId });
        
        // If balance is 0, check if user might have funds on a different chain
        const baseId = 8453;
        const arbitrumId = 42161;
        const chainNames: Record<number, string> = {
          [targetChainId]: "Scroll",
          [baseId]: "Base",
          [arbitrumId]: "Arbitrum",
        };
        
        let errorMessage: string;
        if (tokenBalance === BigInt(0) && chainId !== targetChainId) {
          // User might have funds on Scroll (default chain)
          const currentChainName = chainNames[chainId] || `Chain ${chainId}`;
          errorMessage = validLanguage === "es"
            ? `No tienes USDC en ${currentChainName}. Por favor cambia a Scroll (la red predeterminada) donde tienes tu balance de USDC. El balance actual en ${currentChainName} es 0 USDC.`
            : `You don't have USDC on ${currentChainName}. Please switch to Scroll (the default network) where you have your USDC balance. Current balance on ${currentChainName}: 0 USDC.`;
          
          console.log("User is on wrong chain. Should switch to Scroll:", targetChainId);
        } else {
          // Genuine insufficient funds
          const insufficientFundsMsg = buyT.toast.insufficientFunds || 
            (validLanguage === "es" 
              ? "Fondos insuficientes. Necesitas al menos {amount} USDC para pagar la prima."
              : "Insufficient funds. You need at least {amount} USDC to pay the premium.");
          const formattedAmount = formatPremium(premiumInUsdc);
          errorMessage = insufficientFundsMsg.replace("{amount}", formattedAmount);
        }
        
        console.log("About to show insufficient funds toast:", errorMessage);
        try {
          showErrorToast(errorMessage);
          console.log("Toast function called successfully");
        } catch (toastError) {
          console.error("Error showing toast:", toastError);
          // Fallback to alert if toast fails
          alert(errorMessage);
        }
        setIsProcessingPayment(false);
        return;
      }
      
      console.log("Balance sufficient, proceeding with approval");

      // Estimate gas and send approval on Scroll
      console.log("Estimating gas for approval", { tokenAddress, contractAddress: INSURANCE_CONTRACT_ADDRESS, premiumInWei: premiumInWei.toString(), chainId: targetChainId });
      const gasEstimate = await publicClient.estimateContractGas({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [INSURANCE_CONTRACT_ADDRESS, premiumInWei],
        account: address,
      });
      console.log("Gas estimate:", gasEstimate.toString());

      const gasLimit = gasEstimate + (gasEstimate * BigInt(20) / BigInt(100));
      const gasPrice = await publicClient.getGasPrice();

      console.log("Sending approval transaction");
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [INSURANCE_CONTRACT_ADDRESS, premiumInWei],
        account: address,
        gas: gasLimit,
        maxFeePerGas: gasPrice * BigInt(2),
        maxPriorityFeePerGas: gasPrice / BigInt(10),
      });
      console.log("Approval transaction hash:", hash);

      setApprovalTxHash(hash);
      showSuccessToast(validLanguage === "es" ? "Aprobación enviada. Esperando confirmación..." : "Approval sent. Waiting for confirmation...");

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        setIsApproved(true);
        showSuccessToast(validLanguage === "es" ? "USDC aprobado exitosamente" : "USDC approved successfully");
      }
    } catch (error: any) {
      console.error("Error approving tokens:", error);
      console.error("Error details:", {
        message: error?.message,
        shortMessage: error?.shortMessage,
        cause: error?.cause,
        stack: error?.stack
      });
      
      let errorMessage: string = buyT.toast.paymentError || (validLanguage === "es" ? "Error al procesar el pago" : "Error processing payment");
      
      if (error?.message?.includes("user rejected") || error?.message?.includes("User denied") || error?.message?.includes("rejected")) {
        errorMessage = validLanguage === "es" ? "Transacción cancelada por el usuario" : "Transaction cancelled by user";
      } else if (error?.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error?.message) {
        errorMessage = error.message.length > 100 ? error.message.substring(0, 100) + "..." : error.message;
      }
      
      showErrorToast(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePurchase = async () => {
    if (!termsAccepted) {
      showErrorToast(validLanguage === "es" ? "Debes aceptar los términos y condiciones" : "You must accept the terms and conditions");
      return;
    }

    if (!isApproved) {
      showErrorToast(validLanguage === "es" ? "Por favor aprueba USDC primero" : "Please approve USDC first");
      return;
    }

    if (!wallet || !address) {
      showErrorToast(validLanguage === "es" ? "Por favor conecta tu billetera" : "Please connect your wallet");
      return;
    }

    // Ensure wallet is set as active before proceeding
    if (wallets.length > 0 && wallets[0]) {
      try {
        await setActiveWallet(wallets[0]);
        // Small delay to let the wallet client initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn("Error setting active wallet:", error);
      }
    }

    // FORCE switch to Scroll chain FIRST, before checking wallet client
    const walletChainId = typeof wallet.chainId === 'string' && wallet.chainId.startsWith('eip155:')
      ? parseInt(wallet.chainId.split(':')[1])
      : wallet.chainId;
    
    if (chainId !== targetChainId || walletChainId !== targetChainId) {
      console.log("Force switching to Scroll chain before purchase", { current: chainId || walletChainId, target: targetChainId });
      try {
        if (switchChain) {
          await switchChain({ chainId: targetChainId });
        } else if (wallet.switchChain) {
          await wallet.switchChain(targetChainId);
        } else {
          throw new Error("No method available to switch chain");
        }
        // Wait for chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify we're on Scroll now
        const newChainId = typeof wallet.chainId === 'string' && wallet.chainId.startsWith('eip155:')
          ? parseInt(wallet.chainId.split(':')[1])
          : wallet.chainId;
        if (newChainId !== targetChainId) {
          throw new Error(`Failed to switch to Scroll chain. Still on chain ${newChainId}`);
        }
        console.log("Successfully switched to Scroll chain");
      } catch (switchError: any) {
        console.error("Error switching to Scroll chain:", switchError);
        showErrorToast(validLanguage === "es" 
          ? "Error al cambiar a la red Scroll. Por favor cambia manualmente a Scroll (Chain ID: 534352)." 
          : "Error switching to Scroll network. Please switch manually to Scroll (Chain ID: 534352).");
        return;
      }
    }

    // Check wallet client availability after chain switch
    if (!walletClient) {
      // Wait a moment for wallet client to initialize after chain switch
      console.log("Wallet client not immediately available, waiting after chain switch...", {
        wallet: !!wallet,
        address: !!address,
        chainId,
        targetChainId,
        walletsLength: wallets.length
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // If still not available after wait, show helpful error
      if (!walletClient) {
        showErrorToast(
          validLanguage === "es" 
            ? "Cliente de billetera no disponible. Por favor verifica que tu billetera esté conectada y recarga la página." 
            : "Wallet client not available. Please ensure your wallet is connected and refresh the page."
        );
        return;
      }
    }

    if (!walletClient || !publicClient) {
      showErrorToast(validLanguage === "es" ? "Cliente de billetera no disponible" : "Wallet client not available");
      return;
    }

    setIsProcessingPayment(true);
    try {

      // Generate flight ID and convert expiration date
      const flightIdBigInt = BigInt(
        `${formData.date.replace(/-/g, '')}${formData.flightNumber.replace(/\D/g, '')}`.slice(0, 18) || Date.now()
      );

      // Parse date string and create UTC dates to avoid timezone issues
      // formData.date is in YYYY-MM-DD format
      const [year, month, day] = formData.date.split('-').map(Number);
      
      // Create flight date at start of day in UTC
      const flightDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const flightDateTimestamp = BigInt(Math.floor(flightDateObj.getTime() / 1000));
      
      // Create expiration date at end of day in UTC
      const expirationDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      const expirationTimestamp = BigInt(Math.floor(expirationDate.getTime() / 1000));

      // Helper function to convert string to bytes32
      const stringToBytes32 = (str: string): `0x${string}` => {
        // Remove spaces and convert to uppercase
        const cleaned = str.trim().toUpperCase().replace(/\s+/g, '');
        // Convert string to UTF-8 bytes
        const encoder = new TextEncoder();
        const utf8Bytes = encoder.encode(cleaned);
        // Pad to exactly 32 bytes (right padding with zeros)
        const padded = new Uint8Array(32);
        padded.set(utf8Bytes.slice(0, 32));
        // Convert bytes to hex string manually to ensure correct format
        const hex = '0x' + Array.from(padded)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hex as `0x${string}`;
      };

      // Helper function to convert IATA code to bytes3
      const stringToBytes3 = (str: string): `0x${string}` => {
        // IATA codes are exactly 3 characters
        const cleaned = str.trim().toUpperCase().slice(0, 3);
        // Pad to 3 characters if needed (null bytes)
        const paddedStr = cleaned.padEnd(3, '\0');
        // Convert string to UTF-8 bytes
        const encoder = new TextEncoder();
        const utf8Bytes = encoder.encode(paddedStr);
        // Take exactly 3 bytes
        const bytes3 = new Uint8Array(3);
        bytes3.set(utf8Bytes.slice(0, 3));
        // Convert bytes to hex string manually
        const hex = '0x' + Array.from(bytes3)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hex as `0x${string}`;
      };

      // Prepare contract parameters
      const airlineBytes32 = stringToBytes32(formData.airline);
      const flightNumberBytes32 = stringToBytes32(formData.flightNumber);
      const departureAirportBytes3 = stringToBytes3(formData.departureAirport);

      // Validate inputs before sending
      if (!formData.airline || !formData.flightNumber || !formData.departureAirport) {
        throw new Error("Missing required flight information");
      }

      // Check if airline or flight number resulted in empty bytes
      if (airlineBytes32 === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Airline cannot be empty");
      }
      if (flightNumberBytes32 === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Flight number cannot be empty");
      }
      if (departureAirportBytes3 === "0x000000") {
        throw new Error("Departure airport cannot be empty");
      }

      // Ensure flightDate is today or in the future (compare UTC days, not timestamps)
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const todayStart = BigInt(Math.floor(todayUTC.getTime() / 1000));
      
      // Flight date should be today or in the future
      // Use day comparison instead of exact timestamp to avoid timezone issues
      if (flightDateTimestamp < todayStart) {
        const flightDateDisplay = new Date(Number(flightDateTimestamp) * 1000).toISOString().split('T')[0];
        const todayDisplay = new Date().toISOString().split('T')[0];
        console.error("Date validation failed:", {
          flightDate: formData.date,
          flightDateTimestamp: flightDateTimestamp.toString(),
          todayStart: todayStart.toString(),
          flightDateUTC: flightDateObj.toISOString(),
          todayUTC: todayUTC.toISOString(),
          nowUTC: now.toISOString(),
        });
        throw new Error(`Flight date (${flightDateDisplay}) must be today (${todayDisplay}) or in the future`);
      }
      
      console.log("Date validation passed:", {
        flightDate: formData.date,
        flightDateTimestamp: flightDateTimestamp.toString(),
        todayStart: todayStart.toString(),
        flightDateUTC: flightDateObj.toISOString(),
        todayUTC: todayUTC.toISOString(),
        nowUTC: now.toISOString(),
        timeDiff: (flightDateTimestamp - todayStart).toString() + " seconds",
      });
      
      // Contract requires expiration to be strictly greater than flightDate
      // Set expiration to at least 1 day after flight date to ensure it passes validation
      let finalExpiration = expirationTimestamp;
      const oneDayInSeconds = BigInt(86400);
      
      // Ensure expiration is at least 1 day after flightDate
      if (expirationTimestamp <= flightDateTimestamp) {
        finalExpiration = flightDateTimestamp + oneDayInSeconds;
        console.warn("Adjusted expiration to be after flight date:", {
          original: expirationTimestamp.toString(),
          adjusted: finalExpiration.toString(),
        });
      } else {
        // Even if expiration is after flightDate, ensure it's at least 1 day later
        // Some contracts require a minimum gap
        const timeDiff = expirationTimestamp - flightDateTimestamp;
        if (timeDiff < oneDayInSeconds) {
          finalExpiration = flightDateTimestamp + oneDayInSeconds;
          console.warn("Adjusted expiration to be at least 1 day after flight date:", {
            original: expirationTimestamp.toString(),
            adjusted: finalExpiration.toString(),
            timeDiff: timeDiff.toString(),
          });
        }
      }

      // Validate ticket price is greater than 0
      const ticketPriceWei = BigInt(Math.floor(ticketPriceNum * 1e6));
      if (ticketPriceWei <= BigInt(0)) {
        throw new Error("Ticket price must be greater than 0");
      }

      // Prepare the Params struct
      const params = {
        flightId: flightIdBigInt,
        ticketPrice: ticketPriceWei,
        expiration: finalExpiration,
        airline: airlineBytes32,
        flightNumber: flightNumberBytes32,
        flightDate: flightDateTimestamp,
        departureAirportIata: departureAirportBytes3,
      };

      // Log parameters for debugging
      console.log("Contract parameters:", {
        flightId: params.flightId.toString(),
        ticketPrice: params.ticketPrice.toString(),
        expiration: params.expiration.toString(),
        expirationDate: new Date(Number(params.expiration) * 1000).toISOString(),
        airline: params.airline,
        flightNumber: params.flightNumber,
        flightDate: params.flightDate.toString(),
        flightDateDate: new Date(Number(params.flightDate) * 1000).toISOString(),
        departureAirportIata: params.departureAirportIata,
      });

      // Estimate gas for buyPolicy on Scroll
      const gasEstimate = await publicClient.estimateContractGas({
        address: INSURANCE_CONTRACT_ADDRESS,
        abi: INSURANCE_CONTRACT_ABI,
        functionName: "buyPolicy",
        args: [params],
        account: address,
      });

      const gasLimit = gasEstimate + (gasEstimate * BigInt(20) / BigInt(100));
      const gasPrice = await publicClient.getGasPrice();

      // Call buyPolicy (nonpayable - USDC handled internally via transferFrom)
      if (!walletClient) {
        throw new Error("Wallet client not available");
      }
      const hash = await walletClient.writeContract({
        address: INSURANCE_CONTRACT_ADDRESS,
        abi: INSURANCE_CONTRACT_ABI,
        functionName: "buyPolicy",
        args: [params],
        account: address,
        gas: gasLimit,
        maxFeePerGas: gasPrice * BigInt(2),
        maxPriorityFeePerGas: gasPrice / BigInt(10),
      });

      setTxHash(hash);
      showSuccessToast(validLanguage === "es" ? "Transacción enviada. Esperando confirmación..." : "Transaction sent. Waiting for confirmation...");

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        // Create policy record via API
        const policyData = {
          userAddress: address,
          airline: formData.airline,
          flightNumber: formData.flightNumber,
          date: formData.date,
          departureAirport: formData.departureAirport,
          ticketPrice: ticketPriceNum,
          premium,
          originalPremium: codeResponse?.originalPremium || basePremium,
          discountAmount: codeResponse?.discountAmount || 0,
          promoCode: appliedCode,
          codeDiscountType: codeResponse?.discountType,
          codeDiscountValue: codeResponse?.discountValue,
          flightStatus: flightStatus,
          transactionHash: hash,
        };

        const response = await fetch("/api/policy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(policyData),
        });

        const data = await response.json();

        if (response.ok && data.policy) {
          setCreatedPolicy(data.policy);
          showSuccessToast(buyT.toast.paymentSuccess);
          // Redirect to policy details page
          setTimeout(() => {
            router.push(`/policy/${data.policy.id}`);
          }, 1500);
        } else {
          showErrorToast(data.error || buyT.toast.paymentError);
        }
      }
    } catch (error: any) {
      console.error("Error purchasing policy:", error);
      let errorMessage: string = buyT.toast.paymentError;
      if (error?.message?.includes("insufficient")) {
        const premiumNum = typeof premium === 'bigint' ? Number(premium) : Number(premium);
        errorMessage = (buyT.toast.insufficientFunds || "Insufficient funds. You need at least {amount} USDC.").replace("{amount}", formatPremium(premiumNum));
      } else if (error?.message?.includes("user rejected") || error?.message?.includes("User denied")) {
        errorMessage = validLanguage === "es" ? "Transacción cancelada" : "Transaction cancelled";
      } else if (error?.shortMessage) {
        errorMessage = error.shortMessage;
      }
      showErrorToast(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authenticated) {
      showErrorToast(buyT.toast.loginRequired);
      return;
    }

    if (!address) {
      showErrorToast(validLanguage === "es" ? "Por favor conecta tu billetera" : "Please connect your wallet");
      return;
    }

    // Validate flight exists before submission
    if (!flightStatus?.exists) {
      showErrorToast(buyT.toast.validateFlightFirst);
      return;
    }

    // Validate terms accepted
    if (!termsAccepted) {
      showErrorToast(validLanguage === "es" ? "Debes aceptar los términos y condiciones" : "You must accept the terms and conditions");
      return;
    }

    // Show quote/get approval
    // The purchase will be handled by handlePurchase function after approval
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value,
    };
    setFormData(newFormData);
    
    // Clear code if ticket price changes
    if (e.target.name === "ticketPrice" && codeResponse) {
      setCodeResponse(null);
      setAppliedCode(null);
    }
    
    // Clear flight validation if airline, flight number, date, or departure airport changes
    if (['airline', 'flightNumber', 'date', 'departureAirport'].includes(e.target.name)) {
      setFlightStatus(null);
      setFlightValidationError(null);
    }
    
    // Reset terms acceptance if form data changes significantly
    if (['airline', 'flightNumber', 'date', 'departureAirport', 'ticketPrice'].includes(e.target.name)) {
      setTermsAccepted(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100">
      <Header />

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-stone-800">{buyT.title}</h1>
            <p className="text-lg text-stone-600">
              {buyT.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-stone-800">{buyT.formTitle}</h2>
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
                <div>
                  <label htmlFor="airline" className="block text-sm font-medium text-stone-700 mb-2">
                    {buyT.fields.airline}
                  </label>
                  <select
                    id="airline"
                    name="airline"
                    value={formData.airline}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">{buyT.fields.selectAirline}</option>
                    <option value="aeromexico">Aeroméxico</option>
                    <option value="volaris">Volaris</option>
                    <option value="vivaaerobus">Viva Aerobus</option>
                    <option value="interjet">Interjet</option>
                    <option value="american">American Airlines</option>
                    <option value="delta">Delta</option>
                    <option value="copa">Copa Airlines</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="flightNumber" className="block text-sm font-medium text-stone-700 mb-2">
                    {buyT.fields.flightNumber}
                  </label>
                  <input
                    type="text"
                    id="flightNumber"
                    name="flightNumber"
                    value={formData.flightNumber}
                    onChange={handleChange}
                    required
                    placeholder="AM123"
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-stone-700 mb-2">
                    {buyT.fields.date}
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="departureAirport" className="block text-sm font-medium text-stone-700 mb-2">
                    {buyT.fields.departureAirport}
                  </label>
                  <select
                    id="departureAirport"
                    name="departureAirport"
                    value={formData.departureAirport}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">{buyT.fields.selectDepartureAirport}</option>
                    {AIRPORTS.map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Flight Validation Status */}
                {(isValidatingFlight || flightStatus !== null || flightValidationError) && (
                  <div className="p-3 rounded-lg border">
                    {isValidatingFlight && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                        <span className="text-sm">{buyT.flightValidation.validating}</span>
                      </div>
                    )}
                    {flightStatus?.exists && !isValidatingFlight && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">{buyT.flightValidation.valid}</span>
                        </div>
                        {flightStatus.departure && flightStatus.arrival && (
                          <div className="text-xs text-stone-600 space-y-1">
                            <div>
                              <span className="font-medium">{buyT.flightValidation.route}:</span>{" "}
                              {flightStatus.departure.airport} ({flightStatus.departure.airportIata}) → {flightStatus.arrival.airport} ({flightStatus.arrival.airportIata})
                            </div>
                            {flightStatus.departure.scheduledTimeLocal && (
                              <div>
                                <span className="font-medium">{buyT.flightValidation.departureTime}:</span> {flightStatus.departure.scheduledTimeLocal}
                              </div>
                            )}
                            {flightStatus.arrival.scheduledTimeLocal && (
                              <div>
                                <span className="font-medium">{buyT.flightValidation.arrivalTime}:</span> {flightStatus.arrival.scheduledTimeLocal}
                              </div>
                            )}
                            {flightStatus.status && (
                              <div>
                                <span className="font-medium">{buyT.flightValidation.status}:</span> {flightStatus.rawStatus || flightStatus.status}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {flightStatus?.exists === false && !isValidatingFlight && (
                      <div className="flex items-center gap-2 text-red-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">{buyT.flightValidation.invalid}</span>
                      </div>
                    )}
                    {flightValidationError && !isValidatingFlight && (
                      <div className="text-xs text-red-600 mt-1">{flightValidationError}</div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="ticketPrice" className="block text-sm font-medium text-stone-700 mb-2">
                    {buyT.fields.ticketPrice}
                  </label>
                  <input
                    type="number"
                    id="ticketPrice"
                    name="ticketPrice"
                    value={formData.ticketPrice}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="8500"
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Promo Code Section */}
                <div>
                  <label htmlFor="promoCode" className="block text-sm font-medium text-stone-700 mb-2">
                    {buyT.fields.promoCode}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="promoCode"
                      name="promoCode"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder={buyT.promoCode.placeholder}
                      disabled={isApplyingCode}
                      className="flex-1 px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed uppercase"
                      style={{ textTransform: "uppercase" }}
                    />
                    {appliedCode ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveCode}
                        className="whitespace-nowrap"
                      >
                        {buyT.promoCode.remove}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleApplyCode}
                        disabled={isApplyingCode || !promoCode.trim() || !ticketPriceNum}
                        className="whitespace-nowrap"
                      >
                        {isApplyingCode ? buyT.promoCode.applying : buyT.promoCode.apply}
                      </Button>
                    )}
                  </div>
                  
                  {/* Code Status Messages */}
                  {codeResponse && !codeResponse.success && (
                    <p className="mt-2 text-sm text-red-600">{codeResponse.message || codeResponse.error}</p>
                  )}
                  
                  {appliedCode && codeResponse?.success && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        ✓ {buyT.promoCode.applied.replace('{code}', appliedCode)}
                      </p>
                      {codeResponse.remainingUses !== null && codeResponse.remainingUses !== undefined && (
                        <p className="text-xs text-green-600 mt-1">
                          {buyT.promoCode.remainingUses.replace('{count}', codeResponse.remainingUses.toString())}
                        </p>
                      )}
                      {codeResponse.expiresAt && (
                        <p className="text-xs text-green-600 mt-1">
                          {buyT.promoCode.expires.replace('{date}', new Date(codeResponse.expiresAt).toLocaleDateString(validLanguage === 'es' ? 'es-MX' : 'en-US'))}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Approval and Purchase Buttons */}
                {flightStatus?.exists && ticketPriceNum > 0 && (
                  <div className="pt-4 space-y-3">
                    {!isApproved ? (
                      <>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-stone-600">
                          <p className="font-medium text-stone-900 mb-1">
                            {validLanguage === "es" ? "Paso 1: Aprobar USDC" : "Step 1: Approve USDC"}
                          </p>
                          <p>
                            {validLanguage === "es" 
                              ? `Permite al contrato usar ${formatPremium(premium)} USDC de tu billetera.`
                              : `Allow the contract to use ${formatPremium(premium)} USDC from your wallet.`
                            }
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleApproveTokens}
                          disabled={!termsAccepted || isProcessingPayment || !authenticated || !address || !tokenAddress}
                          className="w-full"
                          size="lg"
                        >
                          {isProcessingPayment
                            ? (validLanguage === "es" ? "Aprobando..." : "Approving...")
                            : `${validLanguage === "es" ? "Aprobar" : "Approve"} ${formatPremium(premium)} USDC`
                          }
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-xs">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="font-medium text-green-900">
                              {validLanguage === "es" ? "USDC Aprobado ✓" : "USDC Approved ✓"}
                            </p>
                          </div>
                          <p className="text-xs text-green-700 mt-1 ml-6">
                            {validLanguage === "es" 
                              ? "Paso 2: Ahora puedes comprar la póliza."
                              : "Step 2: Now you can purchase the policy."
                            }
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handlePurchase}
                          disabled={!termsAccepted || isProcessingPayment || !authenticated || !address}
                          className="w-full"
                          size="lg"
                        >
                          {isProcessingPayment
                            ? (validLanguage === "es" ? "Procesando..." : "Processing...")
                            : `${validLanguage === "es" ? "Comprar Póliza" : "Purchase Policy"} - ${formatPremium(premium)} USDC`
                          }
                        </Button>
                      </>
                    )}
                    
                    {approvalTxHash && (
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                        <p className="text-xs text-stone-600 mb-1">
                          {validLanguage === "es" ? "Transacción de Aprobación:" : "Approval Transaction:"}
                        </p>
                        <a
                          href={chainId === 534352 ? `https://scrollscan.com/tx/${approvalTxHash}` :
                                chainId === 8453 ? `https://basescan.org/tx/${approvalTxHash}` :
                                `https://arbiscan.io/tx/${approvalTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-amber-600 hover:underline break-all"
                        >
                          {approvalTxHash}
                        </a>
                      </div>
                    )}
                    
                    {txHash && (
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg">
                        <p className="text-xs text-stone-600 mb-1">
                          {validLanguage === "es" ? "Transacción de Compra:" : "Purchase Transaction:"}
                        </p>
                        <a
                          href={chainId === 534352 ? `https://scrollscan.com/tx/${txHash}` :
                                chainId === 8453 ? `https://basescan.org/tx/${txHash}` :
                                `https://arbiscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-amber-600 hover:underline break-all"
                        >
                          {txHash}
                        </a>
                      </div>
                    )}
                    
                    {(!flightStatus?.exists && !isValidatingFlight && formData.airline && formData.flightNumber && formData.date && formData.departureAirport) && (
                      <p className="mt-2 text-xs text-red-600 text-center">
                        {buyT.toast.validateFlightFirst}
                      </p>
                    )}
                    {!termsAccepted && (
                      <p className="mt-2 text-xs text-red-600 text-center">
                        {validLanguage === "es" ? "Debes aceptar los términos y condiciones para continuar" : "You must accept the terms and conditions to continue"}
                      </p>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Quote Preview */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-stone-800">{buyT.quote.title}</h2>
              
              {ticketPriceNum > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white/60 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-stone-600">{buyT.quote.ticketPrice}</span>
                      <span className="font-semibold text-stone-800">
                        {ticketPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                      </span>
                    </div>
                    
                    {/* Original Premium */}
                    <div className="flex justify-between mb-2">
                      <span className="text-stone-600">{buyT.quote.originalPremium}</span>
                      <span className={`font-semibold ${appliedCode ? 'text-stone-500 line-through' : 'text-amber-700'}`}>
                        {originalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                      </span>
                    </div>
                    
                    {/* Discount Display */}
                    {appliedCode && discountAmount > 0 && (
                      <>
                        <div className="flex justify-between mb-2 text-green-600">
                          <span className="text-sm">{buyT.quote.discount}</span>
                          <span className="font-semibold">
                            -{discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-stone-600 font-medium">{buyT.quote.finalPremium}</span>
                          <span className="font-bold text-amber-700">
                            {premium.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {!appliedCode && (
                      <div className="flex justify-between mb-2">
                        <span className="text-stone-600">{buyT.quote.premium}</span>
                        <span className="font-semibold text-amber-700">
                          {premium.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                        </span>
                      </div>
                    )}
                    
                    <hr className="my-3 border-amber-200" />
                    <div className="flex justify-between">
                      <span className="font-semibold text-stone-800">{buyT.quote.totalCoverage}</span>
                      <span className="font-bold text-lg text-green-600">
                        {coverage.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                      </span>
                    </div>
                    
                    {/* Code Summary */}
                    {appliedCode && (
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <p className="text-xs text-stone-500 mb-1">{buyT.promoCode.appliedLabel}</p>
                        <p className="text-sm font-medium text-amber-900">{appliedCode}</p>
                        {codeResponse?.discountType === "percentage" && (
                          <p className="text-xs text-stone-600 mt-1">
                            {buyT.promoCode.discount.replace('{value}', codeResponse.discountValue?.toString() || '0')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-stone-800 mb-2">{buyT.coverage.title}</h3>
                    <ul className="text-sm text-stone-600 space-y-1">
                      {buyT.coverage.items.map((item, index) => (
                        <li key={index}>✓ {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-stone-800 mb-2">{buyT.terms.title}</h3>
                    <p className="text-xs text-stone-600 mb-3">
                      {buyT.terms.description}
                    </p>
                    <label htmlFor="acceptTerms" className="flex items-center gap-2 text-sm">
                      <input 
                        type="checkbox" 
                        id="acceptTerms"
                        name="acceptTerms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        required 
                        className="rounded border-amber-300" 
                      />
                      <span className="text-stone-700">{buyT.terms.accept}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500">
                  <p>{buyT.quote.noQuote}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-600 mb-4">
              {validLanguage === "es" ? "¡Póliza Creada Exitosamente!" : "Policy Created Successfully!"}
            </DialogTitle>
          </DialogHeader>
          
          {createdPolicy && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-green-800">
                    {validLanguage === "es" ? "Pago Confirmado" : "Payment Confirmed"}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">{validLanguage === "es" ? "ID de Póliza:" : "Policy ID:"}</span>
                    <span className="font-medium">{createdPolicy.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">{validLanguage === "es" ? "Vuelo:" : "Flight:"}</span>
                    <span className="font-medium">
                      {formData.airline} {formData.flightNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">{validLanguage === "es" ? "Fecha:" : "Date:"}</span>
                    <span className="font-medium">{formData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">{validLanguage === "es" ? "Prima Pagada:" : "Premium Paid:"}</span>
                    <span className="font-medium text-green-600">
                      {premium.toLocaleString('en-US', { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">{validLanguage === "es" ? "Estado:" : "Status:"}</span>
                    <span className="font-medium text-green-600">
                      {validLanguage === "es" ? "Activa" : "Active"}
                    </span>
                  </div>
                  {txHash && (
                    <div className="pt-2 border-t border-green-200">
                      <div className="text-xs text-stone-500 break-all">
                        <span className="font-medium">{validLanguage === "es" ? "Tx Hash:" : "Tx Hash:"}</span> {txHash}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push("/dashboard");
                  }}
                  className="flex-1"
                >
                  {validLanguage === "es" ? "Ver Dashboard" : "View Dashboard"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1"
                >
                  {validLanguage === "es" ? "Cerrar" : "Close"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

