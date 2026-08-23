package sid

import (
	"fmt"
	"hash/fnv"
	"net"
	"os"
	"time"

	"github.com/sony/sonyflake"
)

type Sid struct {
	sf *sonyflake.Sonyflake
}

func NewSid() *Sid {
	settings := sonyflake.Settings{
		StartTime: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		MachineID: machineID,
	}
	sf := sonyflake.NewSonyflake(settings)
	if sf == nil {
		panic("sonyflake not created")
	}
	return &Sid{sf}
}

func machineID() (uint16, error) {
	interfaces, err := net.Interfaces()
	if err == nil {
		for _, iface := range interfaces {
			if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
				continue
			}
			addrs, addrErr := iface.Addrs()
			if addrErr != nil {
				continue
			}
			for _, addr := range addrs {
				var ip net.IP
				switch v := addr.(type) {
				case *net.IPNet:
					ip = v.IP
				case *net.IPAddr:
					ip = v.IP
				}
				ipv4 := ip.To4()
				if ipv4 == nil || !ipv4.IsPrivate() {
					continue
				}
				return uint16(ipv4[2])<<8 + uint16(ipv4[3]), nil
			}
		}
	}

	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		return 0, fmt.Errorf("failed to determine machine id: %w", err)
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(hostname))
	return uint16(h.Sum32() & 0xffff), nil
}
func (s Sid) GenString() (string, error) {
	id, err := s.sf.NextID()
	if err != nil {
		return "", err
	}
	return IntToBase62(int(id)), nil
}
func (s Sid) GenUint64() (uint64, error) {
	return s.sf.NextID()
}
