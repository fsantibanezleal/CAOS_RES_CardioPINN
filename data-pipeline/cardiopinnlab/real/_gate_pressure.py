"""Diagnostic gates for the NS-PINN pressure recovery, separating engine correctness from the weak-signal
high-Re regime. Poiseuille pressure gradient is pure-viscous (O(1/Re)); a stagnation/converging flow has a
convective pressure that is O(1) like the real aorta."""
import numpy as np
import torch

from cardiopinnlab.core.pinn import MLP, seed_everything, select_device, train_loop
from cardiopinnlab.real.flow4d_pinn import RHO, MU


def _train_nd(data_xyzt, data_uvw, coll, wall, U, L, T, seed, n_adam, n_lbfgs, width, depth):
    device = select_device(); seed_everything(seed)
    net = MLP(4, 4, width=width, depth=depth, activation="tanh").to(device)
    f = np.array([1 / L, 1 / L, 1 / L, 1 / T], np.float32)
    d_x = torch.tensor(data_xyzt * f, dtype=torch.float32, device=device)
    d_u = torch.tensor(data_uvw / U, dtype=torch.float32, device=device)
    c0 = torch.tensor(coll * f, dtype=torch.float32, device=device)
    wl = torch.tensor(wall * f, dtype=torch.float32, device=device)
    St = L / (U * T); Re = RHO * U * L / MU

    def resid(net, xc):
        out = net(xc); u, v, w, p = out[:, 0:1], out[:, 1:2], out[:, 2:3], out[:, 3:4]
        g = lambda y: torch.autograd.grad(y, xc, torch.ones_like(y), create_graph=True, retain_graph=True)[0]
        du, dv, dw, dp = g(u), g(v), g(w), g(p)
        lap = lambda gv: (lambda gg: g(gg[:, 0:1])[:, 0:1] + g(gg[:, 1:2])[:, 1:2] + g(gg[:, 2:3])[:, 2:3])(g(gv))
        cont = du[:, 0:1] + dv[:, 1:2] + dw[:, 2:3]
        mx = St*du[:,3:4] + (u*du[:,0:1]+v*du[:,1:2]+w*du[:,2:3]) + dp[:,0:1] - lap(u)/Re
        my = St*dv[:,3:4] + (u*dv[:,0:1]+v*dv[:,1:2]+w*dv[:,2:3]) + dp[:,1:2] - lap(v)/Re
        mz = St*dw[:,3:4] + (u*dw[:,0:1]+v*dw[:,1:2]+w*dw[:,2:3]) + dp[:,2:3] - lap(w)/Re
        return cont, mx, my, mz

    def closure():
        loss_d = torch.mean((net(d_x)[:, :3] - d_u) ** 2)
        xc = c0.clone().detach().requires_grad_(True)
        cont, mx, my, mz = resid(net, xc)
        loss_p = torch.mean(cont**2) + torch.mean(mx**2 + my**2 + mz**2)
        loss_w = torch.mean(net(wl)[:, :3] ** 2)
        return loss_d + loss_p + loss_w
    train_loop(list(net.parameters()), closure, n_adam=n_adam, n_lbfgs=n_lbfgs, lr=2e-3)
    return net, device, f, Re


def poiseuille(U, seed=0):
    R, Lz = 0.010, 0.060
    rng = np.random.default_rng(seed); n = 4000
    r = R*np.sqrt(rng.uniform(0,1,n)); th = rng.uniform(0,2*np.pi,n)
    x,y,z = r*np.cos(th), r*np.sin(th), rng.uniform(0,Lz,n)
    wv = U*(1-(r/R)**2)
    dxt = np.stack([x,y,z,np.zeros(n)],1).astype(np.float32)
    duv = np.stack([np.zeros(n),np.zeros(n),wv],1).astype(np.float32)
    thw=rng.uniform(0,2*np.pi,1200); zw=rng.uniform(0,Lz,1200)
    wall=np.stack([R*np.cos(thw),R*np.sin(thw),zw,np.zeros(1200)],1).astype(np.float32)
    net,dev,f,Re=_train_nd(dxt,duv,dxt.copy(),wall,U,R,Lz/U,seed,6000,600,64,5)
    zs=np.linspace(0.008,Lz-0.008,30)
    axis=torch.tensor((np.stack([np.zeros(30),np.zeros(30),zs,np.zeros(30)],1).astype(np.float32))*f,dtype=torch.float32,device=dev)
    with torch.no_grad(): p=net(axis)[:,3].cpu().numpy()*(RHO*U**2)
    rec=float(np.polyfit(zs,p,1)[0]); true=float(-8*MU*U/R**2)
    return {"case":f"poiseuille U={U}","Re":round(Re,0),"true":round(true,2),"rec":round(rec,2),"ratio":round(rec/true,3)}


def converging(U0, seed=0):
    """Axisymmetric converging duct (mass-conserving): w = U0*(1+a z), u=-a/2 U0 x, v=-a/2 U0 y (a>0 accel).
    Steady Euler-ish convective pressure along axis: dp/dz = -rho w dw/dz = -rho U0^2 a (1+a z). At z=0
    dp/dz(0) = -rho U0^2 a. This is a CONVECTION-driven O(1) pressure gradient like the real jet."""
    Lz, Rd = 0.060, 0.012; a = 8.0   # 1/m, gentle acceleration
    rng = np.random.default_rng(seed); n = 5000
    z = rng.uniform(0, Lz, n); rr = Rd*np.sqrt(rng.uniform(0,1,n)); th=rng.uniform(0,2*np.pi,n)
    x,y = rr*np.cos(th), rr*np.sin(th)
    w = U0*(1+a*z); u = -0.5*a*U0*x; v = -0.5*a*U0*y
    dxt=np.stack([x,y,z,np.zeros(n)],1).astype(np.float32); duv=np.stack([u,v,w],1).astype(np.float32)
    # no wall no-slip here (inviscid-style core); use a light boundary anchor at inlet plane pressure via data only
    net,dev,f,Re=_train_nd(dxt,duv,dxt.copy(),dxt[:10].copy(),U0,Rd,Lz/U0,seed,7000,700,96,6)
    zs=np.linspace(0.005,Lz-0.005,30)
    axis=torch.tensor((np.stack([np.zeros(30),np.zeros(30),zs,np.zeros(30)],1).astype(np.float32))*f,dtype=torch.float32,device=dev)
    with torch.no_grad(): p=net(axis)[:,3].cpu().numpy()*(RHO*U0**2)
    # true p(z) = -rho U0^2 (a z + a^2 z^2/2) + const
    p_true = -RHO*U0**2*(a*zs + a**2*zs**2/2); p_true -= p_true.mean(); p_rec = p - p.mean()
    corr=float(np.corrcoef(p_true,p_rec)[0,1]); scale=float(np.polyfit(p_true,p_rec,1)[0])
    return {"case":f"converging U0={U0}","Re":round(Re,0),"dp_corr":round(corr,3),"dp_scale":round(scale,3),
            "true_drop_mmHg":round((p_true.max()-p_true.min())/133.322,3),"rec_drop_mmHg":round((p_rec.max()-p_rec.min())/133.322,3)}


if __name__ == "__main__":
    import sys
    print("device", select_device())
    print(poiseuille(0.05))    # Re ~150: viscous gradient resolvable -> engine correctness
    print(poiseuille(0.2))     # Re ~600
    print(converging(1.0))     # convection-driven O(1) pressure, aortic scale
