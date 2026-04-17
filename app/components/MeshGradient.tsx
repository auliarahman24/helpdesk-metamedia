"use client";

export default function MeshGradient() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-campus-primary/5 blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-400/5 blur-[80px]" />
    </div>
  );
}
